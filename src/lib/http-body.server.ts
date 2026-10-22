/** Cap JSON bodies on public API routes. Prevents oversized payload DoS. */
export const MAX_JSON_BODY_BYTES = 16 * 1024;

export async function readJsonBody(
  request: Request,
  maxBytes = MAX_JSON_BODY_BYTES,
): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  const declared = request.headers.get("content-length");
  if (declared) {
    const n = Number(declared);
    if (Number.isFinite(n) && n > maxBytes) {
      return {
        ok: false,
        response: Response.json(
          { error: "payload_too_large", detail: `Body must be at most ${maxBytes} bytes` },
          { status: 413, headers: { "Cache-Control": "no-store" } },
        ),
      };
    }
  }
  const text = await request.text();
  if (text.length > maxBytes) {
    return {
      ok: false,
      response: Response.json(
        { error: "payload_too_large", detail: `Body must be at most ${maxBytes} bytes` },
        { status: 413, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
  if (!text.trim()) {
    return {
      ok: false,
      response: Response.json(
        { error: "bad_request", detail: "JSON body required" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return {
      ok: false,
      response: Response.json(
        { error: "bad_request", detail: "Body must be JSON" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
}
