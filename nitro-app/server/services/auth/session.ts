import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { HTTPError } from "nitro/h3";
import { accessGrants, authIdentities, sessions, users } from "../../../database/schema/index.ts";
import { getDb } from "../../repositories/db.ts";

export const SESSION_COOKIE = "captcha_session";
export const SESSION_AGE_SECONDS = 60 * 60 * 24 * 7;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createGoogleSession(identity: { subject: string; email: string; name: string | null }) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_AGE_SECONDS * 1000);
  const db = getDb();

  const user = await db.transaction(async (tx) => {
    const [linked] = await tx.select({ userId: authIdentities.userId })
      .from(authIdentities)
      .where(and(eq(authIdentities.provider, "google"), eq(authIdentities.providerSubject, identity.subject)))
      .limit(1);

    let account;
    if (linked) {
      [account] = await tx.select().from(users).where(eq(users.id, linked.userId)).limit(1);
      if (!account || account.status !== "active") {
        throw new HTTPError("Account unavailable", { status: 403 });
      }
      await tx.update(authIdentities)
        .set({ email: identity.email, emailVerified: true, updatedAt: now })
        .where(and(eq(authIdentities.provider, "google"), eq(authIdentities.providerSubject, identity.subject)));
    } else {
      [account] = await tx.insert(users)
        .values({ email: identity.email, displayName: identity.name })
        .onConflictDoNothing()
        .returning();
      if (!account) {
        throw new HTTPError("Email belongs to another account", { status: 409 });
      }
      await tx.insert(authIdentities).values({
        userId: account.id,
        provider: "google",
        providerSubject: identity.subject,
        email: identity.email,
        emailVerified: true,
      });
    }

    await tx.insert(sessions).values({
      userId: account.id,
      tokenHash: hashToken(token),
      authenticatedAt: now,
      expiresAt,
    });
    return account;
  });
  return { token, user: { id: user.id, email: user.email, name: user.displayName } };
}

export async function findSession(token: string | undefined) {
  if (!token) return null;
  const [session] = await getDb().select({
    id: sessions.id,
    expiresAt: sessions.expiresAt,
    userId: users.id,
    email: users.email,
    name: users.displayName,
  }).from(sessions).innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), isNull(sessions.revokedAt),
      gt(sessions.expiresAt, new Date()), eq(users.status, "active")))
    .limit(1);
  return session || null;
}

export async function revokeSession(token: string | undefined) {
  if (!token) return;
  const now = new Date();
  await getDb().transaction(async (tx) => {
    const [revoked] = await tx.update(sessions)
      .set({ revokedAt: now, updatedAt: now })
      .where(and(eq(sessions.tokenHash, hashToken(token)), isNull(sessions.revokedAt)))
      .returning({ id: sessions.id });
    if (revoked) await tx.update(accessGrants).set({ revokedAt: now, updatedAt: now })
      .where(and(eq(accessGrants.sessionId, revoked.id), isNull(accessGrants.revokedAt)));
  });
}
