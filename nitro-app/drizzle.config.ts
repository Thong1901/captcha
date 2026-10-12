import { defineConfig } from "drizzle-kit";

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
