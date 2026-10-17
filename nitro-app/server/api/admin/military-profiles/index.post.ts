import { defineHandler } from "nitro";
import { HTTPError } from "nitro/h3";
import { militaryProfiles } from "../../../../database/schema/index.ts";
import { getDb } from "../../../repositories/db.ts";
import { auditProfileAction, requireManager, requireProfileGrant, requireUserSession } from "../../../services/profiles/access.ts";
import { publicProfile, validateProfileInput } from "../../../services/profiles/profile.ts";
import { readJsonBody } from "../../../utils/read-json.ts";

export default defineHandler(async (event) => {
  const session = await requireUserSession(event, true);
  await requireProfileGrant(session);
  const unitCode = await requireManager(session.userId);
  const input = validateProfileInput(await readJsonBody(event));
  if (input.unitCode !== unitCode) throw new HTTPError("Unit outside manager scope", { status: 403 });
  const [profile] = await getDb().insert(militaryProfiles).values(input).returning();
  await auditProfileAction({ userId: session.userId, sessionId: session.id,
    eventType: "profile.create", profileId: profile.id, success: true });
  return Response.json(publicProfile(profile), { status: 201, headers: { "Cache-Control": "no-store" } });
});
