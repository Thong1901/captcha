import { and, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { HTTPError, getCookie, type H3Event } from "nitro/h3";
import {
  accessGrants, auditEvents, sessions, userRoles, users, verificationAttempts, verificationChallenges,
} from "../../../database/schema/index.ts";
import { getDb } from "../../repositories/db.ts";
import { findSession, SESSION_COOKIE } from "../auth/session.ts";
import { findFaceTemplate } from "../face/template.ts";
import { requireSameOrigin } from "../../utils/same-origin.ts";
import { getServerConfig } from "../../utils/config.ts";

export const PROFILE_PURPOSE = "view_military_profile";
export const GRANT_DURATION_MS = 5 * 60 * 1000;

export async function requireUserSession(event: H3Event, write = false) {
  if (write) requireSameOrigin(event, getServerConfig().appOrigin);
  const session = await findSession(getCookie(event, SESSION_COOKIE));
  if (!session) throw new HTTPError("Sign in required", { status: 401 });
  return session;
}

export async function getProfileGrant(sessionId: string, userId: string) {
  if (!await findFaceTemplate(userId)) return null;
  const [grant] = await getDb().select({ id: accessGrants.id, expiresAt: accessGrants.expiresAt })
    .from(accessGrants)
    .innerJoin(verificationAttempts, eq(accessGrants.verificationAttemptId, verificationAttempts.id))
    .innerJoin(verificationChallenges, eq(verificationAttempts.challengeId, verificationChallenges.id))
    .where(and(
      eq(accessGrants.sessionId, sessionId), eq(accessGrants.purpose, PROFILE_PURPOSE),
      isNull(accessGrants.revokedAt), gt(accessGrants.expiresAt, new Date()),
      eq(verificationAttempts.sessionId, sessionId), eq(verificationAttempts.success, true),
      eq(verificationChallenges.sessionId, sessionId),
      eq(verificationChallenges.purpose, PROFILE_PURPOSE), isNotNull(verificationChallenges.consumedAt),
      sql`${verificationAttempts.metadata}->>'padVerified' = 'true'`,
    )).orderBy(desc(accessGrants.expiresAt)).limit(1);
  return grant || null;
}

export async function requireProfileGrant(session: { id: string; userId: string }) {
  const grant = await getProfileGrant(session.id, session.userId);
  if (!grant) throw new HTTPError("Recent face and PAD verification required", { status: 403 });
  return grant;
}

export async function issueProfileGrant(sessionId: string, attemptId: string) {
  const db = getDb();
  const [activeSession] = await db.select({ userId: sessions.userId }).from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt),
      gt(sessions.expiresAt, new Date()), eq(users.status, "active"))).limit(1);
  if (!activeSession?.userId || !await findFaceTemplate(activeSession.userId)) {
    throw new HTTPError("Active session and face template required", { status: 403 });
  }
  const [attempt] = await db.select({
    success: verificationAttempts.success,
    metadata: verificationAttempts.metadata,
    challengePurpose: verificationChallenges.purpose,
    challengeSessionId: verificationChallenges.sessionId,
    consumedAt: verificationChallenges.consumedAt,
    challengeExpiresAt: verificationChallenges.expiresAt,
  }).from(verificationAttempts)
    .innerJoin(verificationChallenges, eq(verificationAttempts.challengeId, verificationChallenges.id))
    .where(and(eq(verificationAttempts.id, attemptId), eq(verificationAttempts.sessionId, sessionId)))
    .limit(1);
  if (!attempt || !attempt.success || attempt.challengeSessionId !== sessionId ||
      attempt.challengePurpose !== PROFILE_PURPOSE || !attempt.consumedAt ||
      attempt.challengeExpiresAt <= new Date() ||
      (attempt.metadata as { padVerified?: unknown } | null)?.padVerified !== true) {
    throw new HTTPError("Trusted PAD verification required", { status: 403 });
  }
  const now = new Date();
  const [grant] = await db.insert(accessGrants).values({
    sessionId, purpose: PROFILE_PURPOSE, verificationAttemptId: attemptId,
    verifiedAt: now, expiresAt: new Date(now.getTime() + GRANT_DURATION_MS),
  }).returning({ id: accessGrants.id, expiresAt: accessGrants.expiresAt });
  return grant;
}

export async function getRoles(userId: string) {
  return getDb().select({ role: userRoles.role, scopeUnitCode: userRoles.scopeUnitCode })
    .from(userRoles).where(eq(userRoles.userId, userId));
}

export async function requireManager(userId: string) {
  const role = (await getRoles(userId)).find((entry) => entry.role === "manager" && entry.scopeUnitCode);
  if (!role?.scopeUnitCode) throw new HTTPError("Manager role required", { status: 403 });
  return role.scopeUnitCode;
}

export async function requireSystemAdmin(userId: string) {
  if (!(await getRoles(userId)).some((entry) => entry.role === "system_admin")) {
    throw new HTTPError("System administrator role required", { status: 403 });
  }
}

export async function auditProfileAction(input: {
  userId: string; sessionId: string; eventType: string; profileId?: string; success: boolean;
}) {
  await getDb().insert(auditEvents).values({
    userId: input.userId, sessionId: input.sessionId, eventType: input.eventType,
    metadata: { profileId: input.profileId ?? null, success: input.success },
  });
}
