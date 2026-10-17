import { HTTPError, getCookie, type H3Event } from "nitro/h3";
import { findSession, SESSION_COOKIE } from "../auth/session.ts";
import { consumeRateLimit } from "../../repositories/rate-limit.ts";
import { getServerConfig } from "../../utils/config.ts";
import { requireSameOrigin } from "../../utils/same-origin.ts";

export async function requireFaceSession(event: H3Event, write = false) {
  if (write) requireSameOrigin(event, getServerConfig().appOrigin);
  const session = await findSession(getCookie(event, SESSION_COOKIE));
  if (!session) throw new HTTPError("Sign in required", { status: 401 });
  return session;
}

export async function limitFaceRequest(sessionId: string) {
  const result = await consumeRateLimit(`face:${sessionId}`, 6, 60);
  if (!result.allowed) throw new HTTPError("Too many face requests", { status: 429 });
}

export async function readFaceImage(event: H3Event) {
  if (event.req.headers.get("content-type") !== "image/jpeg") {
    throw new HTTPError("Expected JPEG image", { status: 415 });
  }
  const length = Number(event.req.headers.get("content-length"));
  if (Number.isFinite(length) && length > 2_000_000) {
    throw new HTTPError("Image is too large", { status: 413 });
  }
  const reader = event.req.body?.getReader();
  if (!reader) throw new HTTPError("Missing image", { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2_000_000) {
      await reader.cancel();
      throw new HTTPError("Image is too large", { status: 413 });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  if (bytes.length < 100 || bytes.length > 2_000_000 || bytes[0] !== 0xff || bytes[1] !== 0xd8 ||
      bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) {
    throw new HTTPError("Invalid JPEG image", { status: 400 });
  }
  return new Blob([bytes], { type: "image/jpeg" });
}
