import { defineHandler } from "nitro";
import { HTTPError } from "nitro/h3";
import { auditProfileAction, requireManager, requireProfileGrant, requireUserSession } from "../../../../services/profiles/access.ts";
import { linkProfileAccount, publicProfile } from "../../../../services/profiles/profile.ts";
import { readJsonBody } from "../../../../utils/read-json.ts";

export default defineHandler(async (event) => {
  const session = await requireUserSession(event, true);
  await requireProfileGrant(session);
  const unitCode = await requireManager(session.userId);
  const body = await readJsonBody(event) as { email?: unknown } | null;
  if (typeof body?.email !== "string") throw new HTTPError("Invalid email", { status: 400 });
  const profile = await linkProfileAccount(event.context.params?.id || "", unitCode, body.email);
  await auditProfileAction({ userId: session.userId, sessionId: session.id,
    eventType: "profile.link", profileId: profile.id, success: true });
  return Response.json(publicProfile(profile), { headers: { "Cache-Control": "no-store" } });
});
