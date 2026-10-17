import { and, eq } from "drizzle-orm";
import { HTTPError } from "nitro/h3";
import { authIdentities, militaryProfiles, users } from "../../../database/schema/index.ts";
import { getDb } from "../../repositories/db.ts";

export type ProfileInput = {
  fullName: string; dateOfBirth: string; phoneNumber: string; address: string; unitCode: string;
};

function field(value: unknown, name: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new HTTPError(`Invalid ${name}`, { status: 400 });
  }
  return value.trim();
}

export function validateProfileInput(body: unknown): ProfileInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HTTPError("Invalid profile", { status: 400 });
  }
  const value = body as Record<string, unknown>;
  const fullName = field(value.fullName, "fullName", 150);
  const dateOfBirth = field(value.dateOfBirth, "dateOfBirth", 10);
  const phoneNumber = field(value.phoneNumber, "phoneNumber", 25);
  const address = field(value.address, "address", 500);
  const unitCode = field(value.unitCode, "unitCode", 50);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
      Number.isNaN(Date.parse(dateOfBirth)) || new Date(dateOfBirth).toISOString().slice(0, 10) !== dateOfBirth ||
      dateOfBirth > new Date().toISOString().slice(0, 10)) {
    throw new HTTPError("Invalid dateOfBirth", { status: 400 });
  }
  if (!/^\+?[0-9][0-9\s-]{5,23}$/.test(phoneNumber)) {
    throw new HTTPError("Invalid phoneNumber", { status: 400 });
  }
  if (!/^[A-Za-z0-9_-]{1,50}$/.test(unitCode)) {
    throw new HTTPError("Invalid unitCode", { status: 400 });
  }
  return { fullName, dateOfBirth, phoneNumber, address, unitCode };
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function findOwnProfile(userId: string) {
  const [profile] = await getDb().select().from(militaryProfiles)
    .where(and(eq(militaryProfiles.userId, userId), eq(militaryProfiles.status, "active"))).limit(1);
  return profile || null;
}

export async function findManagedProfile(profileId: string, unitCode: string) {
  if (!isUuid(profileId)) throw new HTTPError("Invalid profile ID", { status: 400 });
  const [profile] = await getDb().select().from(militaryProfiles)
    .where(and(eq(militaryProfiles.id, profileId), eq(militaryProfiles.unitCode, unitCode))).limit(1);
  if (!profile) throw new HTTPError("Profile not found", { status: 404 });
  return profile;
}

export function publicProfile(profile: typeof militaryProfiles.$inferSelect) {
  return {
    id: profile.id, fullName: profile.fullName, dateOfBirth: profile.dateOfBirth,
    phoneNumber: profile.phoneNumber, address: profile.address,
    unitCode: profile.unitCode, status: profile.status,
    hasPortrait: Boolean(profile.portraitFileId), linked: Boolean(profile.userId),
    createdAt: profile.createdAt, updatedAt: profile.updatedAt,
  };
}

export async function linkProfileAccount(profileId: string, unitCode: string, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.length > 320) throw new HTTPError("Invalid email", { status: 400 });
  return getDb().transaction(async (tx) => {
    const [profile] = await tx.select().from(militaryProfiles)
      .where(and(eq(militaryProfiles.id, profileId), eq(militaryProfiles.unitCode, unitCode)))
      .for("update").limit(1);
    if (!profile) throw new HTTPError("Profile not found", { status: 404 });
    if (profile.userId) throw new HTTPError("Profile already linked", { status: 409 });
    const [target] = await tx.select({ id: users.id }).from(users)
      .innerJoin(authIdentities, eq(authIdentities.userId, users.id))
      .where(and(eq(users.email, normalized), eq(users.status, "active"),
        eq(authIdentities.provider, "google"), eq(authIdentities.emailVerified, true)))
      .limit(1);
    if (!target) throw new HTTPError("Verified account not found", { status: 404 });
    const [existing] = await tx.select({ id: militaryProfiles.id }).from(militaryProfiles)
      .where(eq(militaryProfiles.userId, target.id)).limit(1);
    if (existing) throw new HTTPError("Account already linked", { status: 409 });
    const [updated] = await tx.update(militaryProfiles)
      .set({ userId: target.id, updatedAt: new Date() })
      .where(eq(militaryProfiles.id, profileId)).returning();
    return updated;
  });
}
