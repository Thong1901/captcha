import { defineHandler } from "nitro";
import { getProfileGrant, getRoles, requireUserSession } from "../../services/profiles/access.ts";

export default defineHandler(async (event) => {
  const session = await requireUserSession(event);
  const [grant, roles] = await Promise.all([
    getProfileGrant(session.id, session.userId), getRoles(session.userId),
  ]);
  return Response.json({
    canViewProfile: Boolean(grant),
    expiresAt: grant?.expiresAt.toISOString() || null,
    roles,
  }, { headers: { "Cache-Control": "no-store" } });
});
