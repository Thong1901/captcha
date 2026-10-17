import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { eq } from "drizzle-orm";
import { users, sessions } from "../../database/schema/index.ts";
import { getDb, closeDb } from "../../server/repositories/db.ts";
import { createGoogleSession, findSession, revokeSession } from "../../server/services/auth/session.ts";
import { verifyGoogleCredential } from "../../server/services/auth/google.ts";

after(async () => { await closeDb(); });

test("invalid Google credentials are rejected before account creation", async () => {
  await assert.rejects(
    () => verifyGoogleCredential("not-a-google-token", "test-client-id"),
    /Invalid Google credential/,
  );
});

test("session token is hashed, expires, and can be revoked", async () => {
  const db = getDb();
  const email = `test-${randomUUID()}@example.invalid`;
  const subject = randomUUID();
  let userId;
  try {
    const created = await createGoogleSession({ subject, email, name: "Test" });
    userId = created.user.id;
    assert.ok(created.token.length >= 40);
    const [stored] = await db.select().from(sessions).where(eq(sessions.userId, userId));
    assert.notEqual(stored.tokenHash, created.token);
    assert.equal(stored.tokenHash.length, 64);
    assert.equal((await findSession(created.token))?.userId, userId);
    const baseUrl = process.env.AUTH_BASE_URL || "http://localhost:3000";
    const cookie = `captcha_session=${created.token}`;
    const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, { headers: { Cookie: cookie } });
    assert.equal((await sessionResponse.json()).user.id, userId);
    const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookie, Origin: new URL(baseUrl).origin },
    });
    assert.equal(logoutResponse.status, 200);
    assert.equal(await findSession(created.token), null);
    await assert.rejects(
      () => createGoogleSession({ subject: randomUUID(), email, name: "Other" }),
      /Email belongs to another account/,
    );
    const next = await createGoogleSession({ subject, email, name: "Test" });
    const [nextStored] = await db.select().from(sessions).where(eq(sessions.tokenHash,
      createHash("sha256").update(next.token).digest("hex")));
    await db.update(sessions).set({ expiresAt: new Date(0) }).where(eq(sessions.id, nextStored.id));
    assert.equal(await findSession(next.token), null);
    await revokeSession(next.token);
    await db.update(users).set({ status: "blocked" }).where(eq(users.id, userId));
    await assert.rejects(
      () => createGoogleSession({ subject, email, name: "Test" }),
      /Account unavailable/,
    );
  } finally {
    if (userId) await db.delete(users).where(eq(users.id, userId));
  }
});
