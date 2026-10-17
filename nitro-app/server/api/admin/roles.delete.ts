import { defineHandler } from "nitro";
import { HTTPError } from "nitro/h3";
import { and, eq } from "drizzle-orm";
import { auditEvents, userRoles, users } from "../../../database/schema/index.ts";
import { getDb } from "../../repositories/db.ts";
import { requireSystemAdmin, requireUserSession } from "../../services/profiles/access.ts";
import { readJsonBody } from "../../utils/read-json.ts";

export default defineHandler(async (event) => {
  const session = await requireUserSession(event, true);
  await requireSystemAdmin(session.userId);
  const body = await readJsonBody(event) as { email?: unknown; role?: unknown } | null;
  if (body?.role !== "manager" || typeof body.email !== "string") {
    throw new HTTPError("Invalid role revocation", { status: 400 });
  }
  const email = body.email.trim().toLowerCase();
  const [target] = await getDb().select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!target) throw new HTTPError("Account not found", { status: 404 });
  await getDb().transaction(async (tx) => {
    await tx.delete(userRoles).where(and(eq(userRoles.userId, target.id), eq(userRoles.role, "manager")));
    await tx.insert(auditEvents).values({ userId: session.userId, sessionId: session.id,
      eventType: "role.revoke", metadata: { targetUserId: target.id, role: "manager" } });
  });
  return { revoked: true };
});
