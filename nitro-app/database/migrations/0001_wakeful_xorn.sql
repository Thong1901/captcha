ALTER TABLE "auth_identities" ADD COLUMN "email" text;--> statement-breakpoint
UPDATE "auth_identities" AS identity SET "email" = users."email" FROM "users" AS users WHERE identity."user_id" = users."id";--> statement-breakpoint
ALTER TABLE "auth_identities" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_identities" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "authenticated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;
