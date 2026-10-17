CREATE TABLE "access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"verification_attempt_id" uuid NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "military_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"full_name" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"phone_number" text NOT NULL,
	"address" text NOT NULL,
	"unit_code" text NOT NULL,
	"portrait_file_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "private_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"scope_unit_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_role_pk" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_verification_attempt_id_verification_attempts_id_fk" FOREIGN KEY ("verification_attempt_id") REFERENCES "public"."verification_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "military_profiles" ADD CONSTRAINT "military_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "military_profiles" ADD CONSTRAINT "military_profiles_portrait_file_id_private_files_id_fk" FOREIGN KEY ("portrait_file_id") REFERENCES "public"."private_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "access_grants_verification_attempt_idx" ON "access_grants" USING btree ("verification_attempt_id");--> statement-breakpoint
CREATE INDEX "access_grants_session_purpose_idx" ON "access_grants" USING btree ("session_id","purpose");--> statement-breakpoint
CREATE INDEX "access_grants_expires_at_idx" ON "access_grants" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "military_profiles_user_id_idx" ON "military_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "military_profiles_unit_status_idx" ON "military_profiles" USING btree ("unit_code","status");--> statement-breakpoint
CREATE UNIQUE INDEX "private_files_storage_key_idx" ON "private_files" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "user_roles_role_scope_idx" ON "user_roles" USING btree ("role","scope_unit_code");