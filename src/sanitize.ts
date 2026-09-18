// Max length for any single string value from the API.
// Legitimate Swedish calendar strings (day names, holiday names) are never
// longer than this. Anything longer is almost certainly injected content.
const MAX_STRING_LEN = 100;

export const MAX_DAY_RECORDS = 366;
export const MAX_NAME_DAYS_PER_DAY = 10;
export const MAX_SERIALIZED_BYTES = 128 * 1024;

export const RESPONSE_DAY_LIMITS = {
  day: { min: 1, max: 1 },
  month: { min: 0, max: 31 },
  year: { min: 0, max: MAX_DAY_RECORDS },
} as const;

type DayRecordLimits = {
  min: number;
  max: number;
};

// Patterns that appear in prompt injection payloads but never in calendar data.
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|context|text)/i,
  /\bsystem\s*:/i,
  /\bassistant\s*:/i,
  /\bhuman\s*:/i,
  /\buser\s*:/i,
  /<\|im_(start|end|sep)\|>/,
  /\[INST\]|\[\/INST\]/i,
  /<<SYS>>|<\/SYS>/i,
  /^#{1,6}\s/m,
  /```/,
  /<\s*(script|system|prompt|instruction|command)\b/i,
];

export function isSuspicious(value: string): boolean {
  if (value.length > MAX_STRING_LEN) return true;
  return INJECTION_PATTERNS.some((re) => re.test(value));
}

function safeStr(raw: unknown): string {
  if (typeof raw !== "string") return "[redacted: unexpected type]";
  if (isSuspicious(raw)) return "[redacted: suspicious content]";
  return raw;
}

// For "Ja"/"Nej" fields: only allow the two known values, never pass through
// arbitrary strings (an attacker could otherwise use these as injection vectors).
function jaOrNej(raw: unknown): "Ja" | "Nej" {
  return raw === "Ja" ? "Ja" : "Nej";
}

type DayRecord = Record<string, unknown>;

function sanitizeDay(raw: DayRecord): Record<string, unknown> {
  const rawNameDays = raw["namnsdag"];
  if (
    Array.isArray(rawNameDays)
    && rawNameDays.length > MAX_NAME_DAYS_PER_DAY
  ) {
    throw new Error("upstream response contains too many name days");
  }

  const day: Record<string, unknown> = {
    datum:          safeStr(raw["datum"]),
    veckodag:       safeStr(raw["veckodag"]),
    "arbetsfri dag": jaOrNej(raw["arbetsfri dag"]),
    "röd dag":      jaOrNej(raw["röd dag"]),
    vecka:          safeStr(raw["vecka"]),
    "dag i vecka":  safeStr(raw["dag i vecka"]),
    namnsdag: Array.isArray(rawNameDays)
      ? rawNameDays
          .map((n) => safeStr(n))
          .filter((n) => !n.startsWith("[redacted"))
      : [],
    flaggdag: safeStr(raw["flaggdag"] ?? ""),
  };

  // Optional text fields — present only when applicable.
  if ("helgdag" in raw)         day["helgdag"]         = safeStr(raw["helgdag"]);
  if ("helgdagsafton" in raw)   day["helgdagsafton"]   = safeStr(raw["helgdagsafton"]);

  // Presence-only boolean flags — if they appear at all the value is always
  // "Ja", so we hardcode it rather than forwarding whatever the API sent.
  if ("klämdagen" in raw)                    day["klämdagen"]                    = "Ja";
  if ("dag före arbetsfri helgdag" in raw)   day["dag före arbetsfri helgdag"]   = "Ja";

  return day;
}

export function sanitizeCalendarResponse(
  raw: unknown,
  limits: DayRecordLimits = RESPONSE_DAY_LIMITS.year,
): unknown {
  if (
    !Number.isSafeInteger(limits.min)
    || !Number.isSafeInteger(limits.max)
    || limits.min < 0
    || limits.max < limits.min
    || limits.max > MAX_DAY_RECORDS
  ) {
    throw new Error("invalid response day limits");
  }

  // If the upstream returns a non-object (string, number, array at root level),
  // do NOT pass it through — return an empty safe structure instead.
  // A hijacked API could otherwise inject content via a raw string response
  // that would bypass all field-level sanitization.
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    if (limits.min > 0) {
      throw new Error("upstream response contains an unexpected day count");
    }
    return { version: "", startdatum: "", slutdatum: "", dagar: [] };
  }
  const obj = raw as DayRecord;
  const rawDays = obj["dagar"];
  const dayCount = Array.isArray(rawDays) ? rawDays.length : 0;
  if (dayCount < limits.min) {
    throw new Error("upstream response contains an unexpected day count");
  }
  if (dayCount > limits.max) {
    throw new Error("upstream response contains too many day records");
  }

  return {
    // Metadata: keep only the fields an LLM consumer actually needs.
    // Drop "cachetid" (unstable timestamp) and "uri" (mirrors our own request
    // and could be used as an injection surface if the host is compromised).
    version:    safeStr(obj["version"]),
    startdatum: safeStr(obj["startdatum"]),
    slutdatum:  safeStr(obj["slutdatum"]),
    dagar: Array.isArray(rawDays)
      ? rawDays.map((day) => {
          if (
            typeof day !== "object"
            || day === null
            || Array.isArray(day)
          ) {
            throw new Error("upstream response contains an invalid day record");
          }
          return sanitizeDay(day as DayRecord);
        })
      : [],
  };
}

export function serializeCalendarResponse(
  raw: unknown,
  limits: DayRecordLimits = RESPONSE_DAY_LIMITS.year,
): string {
  const serialized = JSON.stringify(
    sanitizeCalendarResponse(raw, limits),
    null,
    0,
  );
  if (new TextEncoder().encode(serialized).byteLength > MAX_SERIALIZED_BYTES) {
    throw new Error("sanitized response is too large");
  }
  return serialized;
}
