import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { HTTPError, type H3Event } from "nitro/h3";
import { eq } from "drizzle-orm";
import { militaryProfiles, privateFiles } from "../../../database/schema/index.ts";
import { getDb } from "../../repositories/db.ts";
import { getServerConfig } from "../../utils/config.ts";

const MAX_UPLOAD_BYTES = 4_000_000;
const MAX_PIXELS = 16_000_000;

function filePath(storageKey: string) {
  if (!/^[0-9a-f-]{36}\.jpg$/.test(storageKey)) {
    throw new HTTPError("Invalid stored file", { status: 500 });
  }
  return resolve(getServerConfig().privateFilesDir, storageKey);
}

export async function readPortraitUpload(event: H3Event) {
  const mime = event.req.headers.get("content-type");
  if (mime !== "image/jpeg" && mime !== "image/png") {
    throw new HTTPError("Expected JPEG or PNG image", { status: 415 });
  }
  const length = Number(event.req.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_UPLOAD_BYTES) {
    throw new HTTPError("Portrait is too large", { status: 413 });
  }
  const reader = event.req.body?.getReader();
  if (!reader) throw new HTTPError("Missing portrait", { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_UPLOAD_BYTES) {
      await reader.cancel();
      throw new HTTPError("Portrait is too large", { status: 413 });
    }
    chunks.push(value);
  }
  if (size < 100) throw new HTTPError("Invalid portrait", { status: 400 });
  const input = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), size);
  try {
    const transformer = sharp(input, { limitInputPixels: MAX_PIXELS, failOn: "error" });
    const metadata = await transformer.metadata();
    if (!metadata.width || !metadata.height || metadata.width < 100 || metadata.height < 100 ||
        !["jpeg", "png"].includes(metadata.format)) {
      throw new Error("Invalid dimensions or format");
    }
    return await transformer.rotate().resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  } catch {
    throw new HTTPError("Invalid portrait image", { status: 400 });
  }
}

export async function savePortrait(profile: typeof militaryProfiles.$inferSelect, bytes: Buffer) {
  const storageKey = `${randomUUID()}.jpg`;
  const path = filePath(storageKey);
  await mkdir(resolve(getServerConfig().privateFilesDir), { recursive: true });
  await writeFile(path, bytes, { flag: "wx", mode: 0o600 });
  try {
    await getDb().transaction(async (tx) => {
      const [file] = await tx.insert(privateFiles)
        .values({ storageKey, mimeType: "image/jpeg", sizeBytes: bytes.length }).returning();
      await tx.update(militaryProfiles)
        .set({ portraitFileId: file.id, updatedAt: new Date() })
        .where(eq(militaryProfiles.id, profile.id));
    });
  } catch (error) {
    await unlink(path).catch(() => {});
    throw error;
  }
  if (profile.portraitFileId) {
    const [old] = await getDb().select().from(privateFiles).where(eq(privateFiles.id, profile.portraitFileId)).limit(1);
    if (old) {
      await getDb().delete(privateFiles).where(eq(privateFiles.id, old.id));
      await unlink(filePath(old.storageKey)).catch(() => {});
    }
  }
}

export async function loadPortrait(fileId: string) {
  const [file] = await getDb().select().from(privateFiles).where(eq(privateFiles.id, fileId)).limit(1);
  if (!file || file.mimeType !== "image/jpeg") throw new HTTPError("Portrait not found", { status: 404 });
  try { return await readFile(filePath(file.storageKey)); }
  catch { throw new HTTPError("Portrait unavailable", { status: 503 }); }
}
