import { defineHandler } from "nitro";
import { HTTPError, setCookie } from "nitro/h3";
import { verifyGoogleCredential } from "../../../services/auth/google.ts";
import { createGoogleSession, SESSION_AGE_SECONDS, SESSION_COOKIE } from "../../../services/auth/session.ts";
import { getServerConfig } from "../../../utils/config.ts";
import { requireSameOrigin } from "../../../utils/same-origin.ts";

export default defineHandler(async (event) => {
  const config = getServerConfig();
  requireSameOrigin(event, config.appOrigin);
  if (!event.req.headers.get("content-type")?.startsWith("application/json")) {
    throw new HTTPError("Expected JSON", { status: 415 });
  }
  let body: unknown;
  try { body = await event.req.json(); } catch {
    throw new HTTPError("Invalid JSON", { status: 400 });
  }
  const credential = (body as { credential?: unknown } | null)?.credential;
  if (typeof credential !== "string" || credential.length < 1 || credential.length > 8192) {
    throw new HTTPError("Invalid credential", { status: 400 });
  }
  const identity = await verifyGoogleCredential(credential, config.googleClientId);
  let session;
  try {
    session = await createGoogleSession(identity);
  } catch (error) {
    if (!(error instanceof HTTPError)) {
      const cause = error as { code?: unknown };
      console.error("[auth] Session creation failed", {
        code: typeof cause?.code === "string" ? cause.code : "unknown",
      });
    }
    throw error;
  }
  const { token, user } = session;
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.appOrigin.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_AGE_SECONDS,
  });
  return { authenticated: true, user };
});
