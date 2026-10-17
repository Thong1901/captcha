import { HTTPError, type H3Event } from "nitro/h3";

export function requireSameOrigin(event: H3Event, appOrigin: string) {
  const origin = event.req.headers.get("origin");
  if (origin !== appOrigin) {
    console.warn("[auth] Request origin rejected", { origin: origin || "missing", expected: appOrigin });
    throw new HTTPError("Invalid request origin", { status: 403 });
  }
}
