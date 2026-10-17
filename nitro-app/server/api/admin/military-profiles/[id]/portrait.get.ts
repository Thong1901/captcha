import { defineHandler } from "nitro";
import { HTTPError } from "nitro/h3";
import { auditProfileAction, requireManager, requireProfileGrant, requireUserSession } from "../../../../services/profiles/access.ts";
import { findManagedProfile } from "../../../../services/profiles/profile.ts";
import { loadPortrait } from "../../../../services/profiles/portrait.ts";

export default defineHandler(async (event) => {
  const session = await requireUserSession(event);
  await requireProfileGrant(session);
  const unitCode = await requireManager(session.userId);
  const profile = await findManagedProfile(event.context.params?.id || "", unitCode);
  if (!profile.portraitFileId) throw new HTTPError("Portrait not found", { status: 404 });
  const bytes = await loadPortrait(profile.portraitFileId);
  await auditProfileAction({ userId: session.userId, sessionId: session.id,
    eventType: "portrait.view", profileId: profile.id, success: true });
  return new Response(new Uint8Array(bytes), { headers: {
    "Content-Type": "image/jpeg", "Cache-Control": "no-store, private",
    "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'",
  } });
});
