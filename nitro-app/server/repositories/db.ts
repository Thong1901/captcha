import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { getServerConfig } from "../utils/config.ts";
import * as schema from "../../database/schema/index.ts";

let client: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!database) {
    const config = getServerConfig();
    client = postgres(config.databaseUrl, { max: 10, prepare: false });
    database = drizzle(client, { schema });
  }
  return database;
}

export async function closeDb() {
  if (client) {
    await client.end({ timeout: 5 });
    client = undefined;
    database = undefined;
  }
}
