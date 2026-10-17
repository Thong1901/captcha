import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { eq } from "drizzle-orm";
import { users } from "../../database/schema/index.ts";
import { closeDb, getDb } from "../../server/repositories/db.ts";
import { createGoogleSession } from "../../server/services/auth/session.ts";

after(async () => { await closeDb(); });

test("face endpoints require a session and expose configured enrollment status", async () => {
  const baseUrl = process.env.AUTH_BASE_URL || "http://localhost:3000";
  const unauthenticated = await fetch(`${baseUrl}/api/face/status`);
  assert.equal(unauthenticated.status, 401);

  const email = `face-test-${randomUUID()}@example.invalid`;
  const created = await createGoogleSession({ subject: randomUUID(), email, name: "Face test" });
  const cookie = `captcha_session=${created.token}`;
  try {
    const statusResponse = await fetch(`${baseUrl}/api/face/status`, { headers: { Cookie: cookie } });
    assert.equal(statusResponse.status, 200);
    assert.deepEqual(await statusResponse.json(), { configured: true, enrolled: false });

    const rejectedOrigin = await fetch(`${baseUrl}/api/face/enroll`, {
      method: "POST", headers: { Cookie: cookie },
    });
    assert.equal(rejectedOrigin.status, 403);

    const missingConsent = await fetch(`${baseUrl}/api/face/enroll`, {
      method: "POST", headers: { Cookie: cookie, Origin: new URL(baseUrl).origin },
    });
    assert.equal(missingConsent.status, 400);

    const missingTemplate = await fetch(`${baseUrl}/api/face/verify`, {
      method: "POST", headers: { Cookie: cookie, Origin: new URL(baseUrl).origin },
    });
    assert.equal(missingTemplate.status, 404);
  } finally {
    await getDb().delete(users).where(eq(users.id, created.user.id));
  }
});
