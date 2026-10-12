import { createClient, type RedisClientType } from "redis";
import { getServerConfig } from "../utils/config";

let client: RedisClientType | undefined;
let connecting: Promise<RedisClientType> | undefined;

export async function getRedis() {
  if (client?.isReady) return client;
  if (connecting) return connecting;

  const config = getServerConfig();
  const nextClient = createClient({ url: config.redisUrl });
  nextClient.on("error", (error) => {
    console.error("[redis] client error", error);
  });
  connecting = nextClient.connect().then(() => {
    client = nextClient;
    connecting = undefined;
    return nextClient;
  }).catch((error) => {
    connecting = undefined;
    throw error;
  });
  return connecting;
}

export async function closeRedis() {
  if (client) {
    await client.quit();
    client = undefined;
  }
}
