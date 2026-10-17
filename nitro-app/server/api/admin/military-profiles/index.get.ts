import { defineHandler } from "nitro";
import { and, eq } from "drizzle-orm";
import { militaryProfiles } from "../../../../database/schema/index.ts";
import { getDb } from "../../../repositories/db.ts";
import { auditProfileAction, requireManager, requireProfileGrant, requireUserSession } from "../../../services/profiles/access.ts";
import { publicProfile } from "../../../services/profiles/profile.ts";

export default defineHandler(async (event) => {
  const session = await requireUserSession(event);
  await requireProfileGrant(session);
  const unitCode = await requireManager(session.userId);
  const profiles = await getDb().select().from(militaryProfiles)
    .where(and(eq(militaryProfiles.unitCode, unitCode), eq(militaryProfiles.status, "active")))
    .limit(100);
  await auditProfileAction({ userId: session.userId, sessionId: session.id,
    eventType: "profile.list", success: true });
  return Response.json(profiles.map(publicProfile), { headers: { "Cache-Control": "no-store" } });
});
