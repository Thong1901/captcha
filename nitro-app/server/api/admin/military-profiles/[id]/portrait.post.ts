import { defineHandler } from "nitro";
import { auditProfileAction, requireManager, requireProfileGrant, requireUserSession } from "../../../../services/profiles/access.ts";
import { findManagedProfile } from "../../../../services/profiles/profile.ts";
import { readPortraitUpload, savePortrait } from "../../../../services/profiles/portrait.ts";

export default defineHandler(async (event) => {
  const session = await requireUserSession(event, true);
  await requireProfileGrant(session);
  const unitCode = await requireManager(session.userId);
  const profile = await findManagedProfile(event.context.params?.id || "", unitCode);
  const bytes = await readPortraitUpload(event);
  await savePortrait(profile, bytes);
  await auditProfileAction({ userId: session.userId, sessionId: session.id,
    eventType: "portrait.update", profileId: profile.id, success: true });
  return { uploaded: true };
});
