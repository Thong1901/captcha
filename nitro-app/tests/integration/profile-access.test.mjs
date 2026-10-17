import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { eq } from "drizzle-orm";
import {
  accessGrants, biometricTemplates, militaryProfiles, sessions, userRoles, users,
  verificationAttempts, verificationChallenges,
} from "../../database/schema/index.ts";
import { closeDb, getDb } from "../../server/repositories/db.ts";
import { createGoogleSession } from "../../server/services/auth/session.ts";
import { issueProfileGrant } from "../../server/services/profiles/access.ts";

after(async () => { await closeDb(); });

test("profile access needs a trusted PAD attempt and expires with session or grant", async () => {
  const db = getDb();
  const baseUrl = process.env.AUTH_BASE_URL || "http://localhost:3000";
  const origin = new URL(baseUrl).origin;
  const created = await createGoogleSession({
    subject: randomUUID(), email: `profile-${randomUUID()}@example.invalid`, name: "Profile test",
  });
  const second = await createGoogleSession({
    subject: randomUUID(), email: `profile-${randomUUID()}@example.invalid`, name: "Other test",
  });
  const cookie = `captcha_session=${created.token}`;
  const secondCookie = `captcha_session=${second.token}`;
  const unitCode = `unit_${randomUUID().slice(0, 8)}`;
  try {
    const [session] = await db.select().from(sessions)
      .where(eq(sessions.tokenHash, createHash("sha256").update(created.token).digest("hex")));
    const [otherSession] = await db.select().from(sessions)
      .where(eq(sessions.tokenHash, createHash("sha256").update(second.token).digest("hex")));
    await db.insert(militaryProfiles).values({ userId: created.user.id, fullName: "Test User",
      dateOfBirth: "1990-01-01", phoneNumber: "+84123456789", address: "Test address", unitCode });
    const [foreignProfile] = await db.insert(militaryProfiles).values({ userId: second.user.id,
      fullName: "Other User", dateOfBirth: "1992-02-02", phoneNumber: "+84123456780",
      address: "Other address", unitCode: "other_unit" }).returning();
    await db.insert(biometricTemplates).values({ userId: created.user.id,
      templateRef: JSON.stringify({ faceToken: "test", faceSetToken: "test" }), modelVersion: "test" });
    await db.insert(userRoles).values({ userId: created.user.id, role: "manager", scopeUnitCode: unitCode });

    const own = () => fetch(`${baseUrl}/api/me/military-profile`, { headers: { Cookie: cookie } });
    const list = () => fetch(`${baseUrl}/api/admin/military-profiles`, { headers: { Cookie: cookie } });
    assert.equal((await own()).status, 403);
    assert.equal((await list()).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/me/military-profile/portrait`,
      { headers: { Cookie: cookie } })).status, 403);

    const [challenge] = await db.insert(verificationChallenges).values({ sessionId: session.id,
      purpose: "view_military_profile", nonceHash: randomUUID(),
      expiresAt: new Date(Date.now() + 60_000), consumedAt: new Date() }).returning();
    const [untrusted] = await db.insert(verificationAttempts).values({ challengeId: challenge.id,
      sessionId: session.id, success: true, metadata: { padVerified: false } }).returning();
    await assert.rejects(() => issueProfileGrant(session.id, untrusted.id), /Trusted PAD/);
    const [wrongSession] = await db.insert(verificationAttempts).values({ challengeId: challenge.id,
      sessionId: otherSession.id, success: true, metadata: { padVerified: true } }).returning();
    await assert.rejects(() => issueProfileGrant(session.id, wrongSession.id), /Trusted PAD/);

    const [trusted] = await db.insert(verificationAttempts).values({ challengeId: challenge.id,
      sessionId: session.id, success: true, metadata: { padVerified: true } }).returning();
    const grant = await issueProfileGrant(session.id, trusted.id);
    assert.ok(grant.expiresAt.getTime() <= Date.now() + 300_000);
    const ownResponse = await own();
    assert.equal(ownResponse.status, 200);
    assert.equal(ownResponse.headers.get("cache-control"), "no-store");
    assert.equal((await ownResponse.json()).unitCode, unitCode);
    assert.equal((await list()).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/me/military-profile`,
      { headers: { Cookie: secondCookie } })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/admin/military-profiles/${foreignProfile.id}`,
      { headers: { Cookie: cookie } })).status, 404);
    assert.equal((await fetch(`${baseUrl}/api/admin/military-profiles/${foreignProfile.id}/portrait`,
      { headers: { Cookie: cookie } })).status, 404);
    assert.equal((await fetch(`${baseUrl}/api/admin/military-profiles/${foreignProfile.id}`,
      { method: "PATCH", headers: { Cookie: cookie, Origin: origin,
        "Content-Type": "application/json" }, body: JSON.stringify({}) })).status, 404);
    const outOfScope = await fetch(`${baseUrl}/api/admin/military-profiles`, {
      method: "POST", headers: { Cookie: cookie, Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: "Out of scope", dateOfBirth: "1990-01-01",
        phoneNumber: "+84123456789", address: "Test", unitCode: "other_unit" }),
    });
    assert.equal(outOfScope.status, 403);

    await db.update(accessGrants).set({ expiresAt: new Date(0) }).where(eq(accessGrants.id, grant.id));
    assert.equal((await own()).status, 403);
    await db.update(accessGrants).set({ expiresAt: new Date(Date.now() + 60_000) })
      .where(eq(accessGrants.id, grant.id));
    await db.update(biometricTemplates).set({ revokedAt: new Date() })
      .where(eq(biometricTemplates.userId, created.user.id));
    assert.equal((await own()).status, 403);
    await db.update(biometricTemplates).set({ revokedAt: null })
      .where(eq(biometricTemplates.userId, created.user.id));
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, session.id));
    assert.equal((await own()).status, 401);
  } finally {
    await db.delete(users).where(eq(users.id, created.user.id));
    await db.delete(users).where(eq(users.id, second.user.id));
  }
});
