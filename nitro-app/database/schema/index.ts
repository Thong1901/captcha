import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { isNull } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  status: text("status").default("active").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("users_email_idx").on(table.email),
]);

export const authIdentities = pgTable("auth_identities", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerSubject: text("provider_subject").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("auth_identities_provider_subject_idx").on(table.provider, table.providerSubject),
  index("auth_identities_user_id_idx").on(table.userId),
]);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  authenticatedAt: timestamp("authenticated_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("sessions_token_hash_idx").on(table.tokenHash),
  index("sessions_user_id_idx").on(table.userId),
  index("sessions_expires_at_idx").on(table.expiresAt),
]);

export const biometricTemplates = pgTable("biometric_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  templateRef: text("template_ref").notNull(),
  modelVersion: text("model_version").notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index("biometric_templates_user_id_idx").on(table.userId),
  uniqueIndex("biometric_templates_active_user_idx").on(table.userId).where(isNull(table.revokedAt)),
]);

export const verificationChallenges = pgTable("verification_challenges", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(),
  nonceHash: text("nonce_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  maxAttempts: integer("max_attempts").default(3).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("verification_challenges_nonce_hash_idx").on(table.nonceHash),
  index("verification_challenges_session_purpose_idx").on(table.sessionId, table.purpose),
  index("verification_challenges_expires_at_idx").on(table.expiresAt),
]);

export const verificationAttempts = pgTable("verification_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  challengeId: uuid("challenge_id").notNull().references(() => verificationChallenges.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  success: boolean("success").notNull(),
  reason: text("reason"),
  metadata: jsonb("metadata"),
  ...timestamps,
}, (table) => [
  index("verification_attempts_challenge_id_idx").on(table.challengeId),
  index("verification_attempts_session_id_idx").on(table.sessionId),
]);

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  metadata: jsonb("metadata"),
  ...timestamps,
}, (table) => [
  index("audit_events_user_id_idx").on(table.userId),
  index("audit_events_session_id_idx").on(table.sessionId),
  index("audit_events_event_type_idx").on(table.eventType),
]);

export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  scopeUnitCode: text("scope_unit_code"),
  ...timestamps,
}, (table) => [
  primaryKey({ columns: [table.userId, table.role] }),
  index("user_roles_role_scope_idx").on(table.role, table.scopeUnitCode),
]);

export const privateFiles = pgTable("private_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("private_files_storage_key_idx").on(table.storageKey),
]);

export const militaryProfiles = pgTable("military_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  fullName: text("full_name").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  phoneNumber: text("phone_number").notNull(),
  address: text("address").notNull(),
  unitCode: text("unit_code").notNull(),
  portraitFileId: uuid("portrait_file_id").references(() => privateFiles.id, { onDelete: "set null" }),
  status: text("status").default("active").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("military_profiles_user_id_idx").on(table.userId),
  index("military_profiles_unit_status_idx").on(table.unitCode, table.status),
]);

export const accessGrants = pgTable("access_grants", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(),
  verificationAttemptId: uuid("verification_attempt_id").notNull().references(() => verificationAttempts.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("access_grants_verification_attempt_idx").on(table.verificationAttemptId),
  index("access_grants_session_purpose_idx").on(table.sessionId, table.purpose),
  index("access_grants_expires_at_idx").on(table.expiresAt),
]);

export const schema = {
  users,
  authIdentities,
  sessions,
  biometricTemplates,
  verificationChallenges,
  verificationAttempts,
  auditEvents,
  userRoles,
  privateFiles,
  militaryProfiles,
  accessGrants,
};
