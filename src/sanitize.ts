// Max length for any single string value from the API.
// Legitimate Swedish calendar strings (day names, holiday names) are never
// longer than this. Anything longer is almost certainly injected content.
const MAX_STRING_LEN = 100;

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
  const day: Record<string, unknown> = {
    datum:          safeStr(raw["datum"]),
    veckodag:       safeStr(raw["veckodag"]),
    "arbetsfri dag": jaOrNej(raw["arbetsfri dag"]),
    "röd dag":      jaOrNej(raw["röd dag"]),
    vecka:          safeStr(raw["vecka"]),
    "dag i vecka":  safeStr(raw["dag i vecka"]),
    namnsdag: Array.isArray(raw["namnsdag"])
      ? (raw["namnsdag"] as unknown[])
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

export function sanitizeCalendarResponse(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const obj = raw as DayRecord;
  return {
    // Metadata: keep only the fields an LLM consumer actually needs.
    // Drop "cachetid" (unstable timestamp) and "uri" (mirrors our own request
    // and could be used as an injection surface if the host is compromised).
    version:    safeStr(obj["version"]),
    startdatum: safeStr(obj["startdatum"]),
    slutdatum:  safeStr(obj["slutdatum"]),
    dagar: Array.isArray(obj["dagar"])
      ? (obj["dagar"] as unknown[]).map((d) => sanitizeDay(d as DayRecord))
      : [],
  };
}
