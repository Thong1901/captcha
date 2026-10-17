import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { HTTPError } from "nitro/h3";
import { accessGrants, biometricTemplates, sessions } from "../../../database/schema/index.ts";
import { getDb } from "../../repositories/db.ts";
import { createFaceSet, deleteFaceSet, detectSingleFace } from "./facepp.ts";

type FaceRef = { faceToken: string; faceSetToken: string };

function parseRef(value: string): FaceRef {
  try {
    const parsed = JSON.parse(value) as FaceRef;
    if (typeof parsed.faceToken === "string" && typeof parsed.faceSetToken === "string") return parsed;
  } catch { /* An invalid stored reference is an unavailable template. */ }
  throw new HTTPError("Face template is unavailable", { status: 503 });
}

export async function findFaceTemplate(userId: string) {
  const [template] = await getDb().select().from(biometricTemplates)
    .where(and(eq(biometricTemplates.userId, userId), isNull(biometricTemplates.revokedAt)))
    .orderBy(desc(biometricTemplates.createdAt)).limit(1);
  return template || null;
}

export async function enrollFace(userId: string, image: Blob) {
  if (await findFaceTemplate(userId)) throw new HTTPError("Face already enrolled", { status: 409 });
  const faceToken = await detectSingleFace(image);
  const faceSetToken = await createFaceSet(faceToken);
  try {
    await getDb().insert(biometricTemplates).values({
      userId,
      templateRef: JSON.stringify({ faceToken, faceSetToken } satisfies FaceRef),
      modelVersion: "facepp-v3",
    });
  } catch (error) {
    try { await deleteFaceSet(faceSetToken); } catch (cleanupError) {
      console.error("[face++] orphan FaceSet cleanup failed", cleanupError);
    }
    throw error;
  }
}

export async function revokeFace(userId: string) {
  const template = await findFaceTemplate(userId);
  if (!template) throw new HTTPError("Face is not enrolled", { status: 404 });
  const reference = parseRef(template.templateRef);
  await deleteFaceSet(reference.faceSetToken);
  const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.update(biometricTemplates)
      .set({ revokedAt: now, updatedAt: now })
      .where(eq(biometricTemplates.id, template.id));
    await tx.update(accessGrants).set({ revokedAt: now, updatedAt: now })
      .where(and(isNull(accessGrants.revokedAt), inArray(accessGrants.sessionId,
        tx.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId)))));
  });
}

export function referenceFaceToken(templateRef: string) {
  return parseRef(templateRef).faceToken;
}
