import { defineHandler } from "nitro";
import { deleteCookie, getCookie } from "nitro/h3";
import { revokeSession, SESSION_COOKIE } from "../../services/auth/session.ts";
import { getServerConfig } from "../../utils/config.ts";
import { requireSameOrigin } from "../../utils/same-origin.ts";

export default defineHandler(async (event) => {
  const config = getServerConfig();
  requireSameOrigin(event, config.appOrigin);
  await revokeSession(getCookie(event, SESSION_COOKIE));
  deleteCookie(event, SESSION_COOKIE, { path: "/" });
  return { authenticated: false };
});
