import { getRedis } from "./redis";

const incrementScript = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
return count
`;

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const redis = await getRedis();
  const count = Number(await redis.eval(incrementScript, {
    keys: [`captcha:rate:${key}`],
    arguments: [String(windowSeconds)],
  }));
  return { allowed: count <= limit, count, remaining: Math.max(0, limit - count) };
}

export async function reserveReplayToken(tokenHash: string, ttlSeconds: number) {
  const redis = await getRedis();
  const result = await redis.set(`captcha:replay:${tokenHash}`, "1", {
    NX: true,
    EX: ttlSeconds,
  });
  return result === "OK";
}
