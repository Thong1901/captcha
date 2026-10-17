import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const client = postgres(databaseUrl, { max: 1 });
try {
  const db = drizzle(client);
  const migrationsFolder = fileURLToPath(new URL("./migrations/", import.meta.url));
  await migrate(db, { migrationsFolder });
  console.log("Database migrations applied");
} finally {
  await client.end();
}
