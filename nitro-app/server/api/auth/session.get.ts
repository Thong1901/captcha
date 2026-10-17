import { defineHandler } from "nitro";
import { getCookie } from "nitro/h3";
import { findSession, SESSION_COOKIE } from "../../services/auth/session.ts";

export default defineHandler(async (event) => {
  const session = await findSession(getCookie(event, SESSION_COOKIE));
  return session
    ? { authenticated: true, user: { id: session.userId, email: session.email, name: session.name } }
    : { authenticated: false, user: null };
});
