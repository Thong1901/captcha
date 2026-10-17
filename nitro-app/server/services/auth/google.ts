import { OAuth2Client } from "google-auth-library";
import { HTTPError } from "nitro/h3";

const client = new OAuth2Client();

export async function verifyGoogleCredential(credential: string, clientId: string) {
  if (!clientId) throw new HTTPError("Google sign-in is not configured", { status: 503 });
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true ||
        !["accounts.google.com", "https://accounts.google.com"].includes(payload.iss)) {
      throw new Error("Invalid Google identity");
    }
    return { subject: payload.sub, email: payload.email, name: payload.name || null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const reason = /Wrong recipient/.test(message) ? "audience"
      : /Invalid issuer/.test(message) ? "issuer"
      : /Token used too late|Token used too early|Expiration time/.test(message) ? "time"
      : /Invalid token signature|No pem found/.test(message) ? "signature-or-key"
      : /Wrong number of segments|Can't parse token/.test(message) ? "malformed"
      : /Invalid Google identity/.test(message) ? "identity-claims"
      : "verification-error";
    console.warn("[auth] Google credential rejected", { reason });
    throw new HTTPError("Invalid Google credential", { status: 401 });
  }
}
