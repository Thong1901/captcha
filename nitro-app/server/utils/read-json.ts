import { HTTPError, type H3Event } from "nitro/h3";

export async function readJsonBody(event: H3Event, maxBytes = 8192): Promise<unknown> {
  if (!event.req.headers.get("content-type")?.startsWith("application/json")) {
    throw new HTTPError("Expected JSON", { status: 415 });
  }
  const reader = event.req.body?.getReader();
  if (!reader) throw new HTTPError("Missing JSON body", { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HTTPError("JSON body is too large", { status: 413 });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new HTTPError("Invalid JSON", { status: 400 }); }
}
