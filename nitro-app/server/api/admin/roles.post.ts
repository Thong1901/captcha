import { defineHandler } from "nitro";
import { HTTPError } from "nitro/h3";
import { and, eq } from "drizzle-orm";
import { authIdentities, auditEvents, userRoles, users } from "../../../database/schema/index.ts";
import { getDb } from "../../repositories/db.ts";
import { requireSystemAdmin, requireUserSession } from "../../services/profiles/access.ts";
import { readJsonBody } from "../../utils/read-json.ts";

export default defineHandler(async (event) => {
  const session = await requireUserSession(event, true);
  await requireSystemAdmin(session.userId);
  const body = await readJsonBody(event) as { email?: unknown; role?: unknown; scopeUnitCode?: unknown } | null;
  if (body?.role !== "manager" || typeof body.email !== "string" ||
      typeof body.scopeUnitCode !== "string" || !/^[A-Za-z0-9_-]{1,50}$/.test(body.scopeUnitCode)) {
    throw new HTTPError("Invalid role assignment", { status: 400 });
  }
  const email = body.email.trim().toLowerCase();
  const [target] = await getDb().select({ id: users.id }).from(users)
    .innerJoin(authIdentities, eq(authIdentities.userId, users.id))
    .where(and(eq(users.email, email), eq(users.status, "active"),
      eq(authIdentities.provider, "google"), eq(authIdentities.emailVerified, true)))
    .limit(1);
  if (!target) throw new HTTPError("Verified account not found", { status: 404 });
  await getDb().transaction(async (tx) => {
    await tx.insert(userRoles).values({ userId: target.id, role: "manager", scopeUnitCode: body.scopeUnitCode as string })
      .onConflictDoUpdate({ target: [userRoles.userId, userRoles.role],
        set: { scopeUnitCode: body.scopeUnitCode as string, updatedAt: new Date() } });
    await tx.insert(auditEvents).values({ userId: session.userId, sessionId: session.id,
      eventType: "role.assign", metadata: { targetUserId: target.id, role: "manager", scopeUnitCode: body.scopeUnitCode } });
  });
  return { assigned: true };
});
