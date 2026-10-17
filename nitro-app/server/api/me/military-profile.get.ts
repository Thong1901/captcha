import { defineHandler } from "nitro";
import { HTTPError } from "nitro/h3";
import { auditProfileAction, requireProfileGrant, requireUserSession } from "../../services/profiles/access.ts";
import { findOwnProfile, publicProfile } from "../../services/profiles/profile.ts";

export default defineHandler(async (event) => {
  const session = await requireUserSession(event);
  await requireProfileGrant(session);
  const profile = await findOwnProfile(session.userId);
  if (!profile) throw new HTTPError("Profile not found", { status: 404 });
  await auditProfileAction({ userId: session.userId, sessionId: session.id,
    eventType: "profile.view", profileId: profile.id, success: true });
  return Response.json(publicProfile(profile), { headers: { "Cache-Control": "no-store" } });
});
