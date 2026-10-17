import { defineHandler } from "nitro";
import { auditProfileAction, requireManager, requireProfileGrant, requireUserSession } from "../../../services/profiles/access.ts";
import { findManagedProfile, publicProfile } from "../../../services/profiles/profile.ts";

export default defineHandler(async (event) => {
  const session = await requireUserSession(event);
  await requireProfileGrant(session);
  const unitCode = await requireManager(session.userId);
  const profile = await findManagedProfile(event.context.params?.id || "", unitCode);
  await auditProfileAction({ userId: session.userId, sessionId: session.id,
    eventType: "profile.view", profileId: profile.id, success: true });
  return Response.json(publicProfile(profile), { headers: { "Cache-Control": "no-store" } });
});
