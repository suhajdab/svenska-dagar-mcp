const BASE_URL = "https://sholiday.faboul.se/dagar/v2.1" as const;
const TIMEOUT_MS = 10_000;

export const MAX_RESPONSE_BYTES = 256 * 1024;

export async function readJsonResponse(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`upstream returned HTTP ${response.status}`);
  }

  const mediaType = response.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== "application/json") {
    throw new Error("upstream returned an unexpected content type");
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) {
      throw new Error("upstream returned an invalid content length");
    }
    if (declaredLength > MAX_RESPONSE_BYTES) {
      throw new Error("upstream response is too large");
    }
  }

  if (response.body === null) {
    throw new Error("upstream returned an empty response");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("upstream response is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  } catch {
    throw new Error("upstream returned invalid JSON");
  }
}

export async function fetchCalendar(path: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}/${path}`, {
      headers: { accept: "application/json" },
      redirect: "error",
      signal: controller.signal,
    });
    return await readJsonResponse(response);
  } finally {
    clearTimeout(timer);
  }
}
