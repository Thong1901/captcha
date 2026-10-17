export function getServerConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  if (!redisUrl) {
    throw new Error("REDIS_URL is required");
  }

  return {
    databaseUrl,
    redisUrl,
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    faceApiKey: process.env.FACE_API_KEY || "",
    faceApiSecret: process.env.FACE_API_SECRET || "",
    privateFilesDir: process.env.PRIVATE_FILES_DIR || "./.data/private-files",
    appOrigin: process.env.APP_ORIGIN || "http://localhost:3000",
    challengeTtlSeconds: readPositiveInt("CHALLENGE_TTL_SECONDS", 300),
    rateLimitWindowSeconds: readPositiveInt("RATE_LIMIT_WINDOW_SECONDS", 60),
    rateLimitMaxRequests: readPositiveInt("RATE_LIMIT_MAX_REQUESTS", 30),
  };
}

function readPositiveInt(name: string, fallback: number) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}
