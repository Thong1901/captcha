import { defineConfig } from "drizzle-kit";
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

export default defineConfig({
  schema: "./database/schema/index.ts",
  out: "./database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/captcha",
  },
  strict: true,
  verbose: true,
});
