import { defineHandler } from "nitro";
import { HTTPError } from "nitro/h3";
import { eq } from "drizzle-orm";
import { militaryProfiles } from "../../../../database/schema/index.ts";
import { getDb } from "../../../repositories/db.ts";
import { auditProfileAction, requireManager, requireProfileGrant, requireUserSession } from "../../../services/profiles/access.ts";
import { findManagedProfile, publicProfile, validateProfileInput } from "../../../services/profiles/profile.ts";
import { readJsonBody } from "../../../utils/read-json.ts";

export default defineHandler(async (event) => {
  const session = await requireUserSession(event, true);
  await requireProfileGrant(session);
  const unitCode = await requireManager(session.userId);
  const profile = await findManagedProfile(event.context.params?.id || "", unitCode);
  const body = await readJsonBody(event);
  const input = validateProfileInput(body);
  if (input.unitCode !== unitCode) throw new HTTPError("Unit outside manager scope", { status: 403 });
  const status = (body as { status?: unknown }).status;
  if (status !== undefined && status !== "active" && status !== "locked") {
    throw new HTTPError("Invalid profile status", { status: 400 });
  }
  const [updated] = await getDb().update(militaryProfiles)
    .set({ ...input, status: status || profile.status, updatedAt: new Date() })
    .where(eq(militaryProfiles.id, profile.id)).returning();
  await auditProfileAction({ userId: session.userId, sessionId: session.id,
    eventType: "profile.update", profileId: profile.id, success: true });
  return Response.json(publicProfile(updated), { headers: { "Cache-Control": "no-store" } });
});
