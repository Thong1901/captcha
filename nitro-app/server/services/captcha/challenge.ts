import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "../../repositories/db";
import { verificationAttempts, verificationChallenges } from "../../../database/schema";

export type ChallengePurpose = "captcha" | "face" | "liveness";

export async function consumeChallenge(input: {
  challengeId: string;
  sessionId: string;
  purpose: ChallengePurpose;
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
        isNull(verificationChallenges.consumedAt),
        gt(verificationChallenges.expiresAt, new Date()),
        sql`${verificationChallenges.attempts} < ${verificationChallenges.maxAttempts}`,
      ))
      .for("update");

    if (!challenge) {
      throw new Error("Challenge is expired, consumed, invalid, or over the attempt limit");
    }

    await tx.insert(verificationAttempts).values({
      challengeId: challenge.id,
      sessionId: input.sessionId,
      success: input.success,
      reason: input.reason,
      metadata: input.metadata,
    });

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

    return { challengeId: challenge.id, consumed: input.success };
  });
}
