import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "../../repositories/db.ts";
import { verificationAttempts, verificationChallenges } from "../../../database/schema/index.ts";

export type ChallengePurpose = "captcha" | "face" | "liveness" | "view_military_profile";

function hashNonce(nonce: string) {
  return createHash("sha256").update(nonce).digest("hex");
}

export async function createChallenge(sessionId: string, purpose: ChallengePurpose, ttlSeconds = 120) {
  const nonce = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const [challenge] = await getDb().insert(verificationChallenges)
    .values({ sessionId, purpose, nonceHash: hashNonce(nonce), expiresAt })
    .returning({ id: verificationChallenges.id });
  return { challengeId: challenge.id, nonce, expiresAt };
}

export async function consumeChallenge(input: {
  challengeId: string;
  sessionId: string;
  purpose: ChallengePurpose;
  nonce: string;
  success: boolean;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [challenge] = await tx
      .select()
      .from(verificationChallenges)
      .where(and(
        eq(verificationChallenges.id, input.challengeId),
        eq(verificationChallenges.sessionId, input.sessionId),
        eq(verificationChallenges.purpose, input.purpose),
        eq(verificationChallenges.nonceHash, hashNonce(input.nonce)),
        isNull(verificationChallenges.consumedAt),
        gt(verificationChallenges.expiresAt, new Date()),
        sql`${verificationChallenges.attempts} < ${verificationChallenges.maxAttempts}`,
      ))
      .for("update");

    if (!challenge) {
      throw new Error("Challenge is expired, consumed, invalid, or over the attempt limit");
    }

    const [attempt] = await tx.insert(verificationAttempts).values({
      challengeId: challenge.id,
      sessionId: input.sessionId,
      success: input.success,
      reason: input.reason,
      metadata: input.metadata,
    }).returning({ id: verificationAttempts.id });

    if (input.success) {
      const [consumed] = await tx
        .update(verificationChallenges)
        .set({ consumedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(verificationChallenges.id, challenge.id), isNull(verificationChallenges.consumedAt)))
        .returning({ id: verificationChallenges.id });
      if (!consumed) throw new Error("Challenge was consumed concurrently");
    } else {
      await tx
        .update(verificationChallenges)
        .set({
          attempts: sql`${verificationChallenges.attempts} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(verificationChallenges.id, challenge.id));
    }

    return { challengeId: challenge.id, attemptId: attempt.id, consumed: input.success };
  });
}
