import { defineHandler } from "nitro";
import { HTTPError } from "nitro/h3";
import { compareFace, detectSingleFace } from "../../services/face/facepp.ts";
import { findFaceTemplate, referenceFaceToken } from "../../services/face/template.ts";
import { limitFaceRequest, readFaceImage, requireFaceSession } from "../../services/face/request.ts";
import { auditProfileAction } from "../../services/profiles/access.ts";

export default defineHandler(async (event) => {
  const session = await requireFaceSession(event, true);
  await limitFaceRequest(session.userId);
  const template = await findFaceTemplate(session.userId);
  if (!template) throw new HTTPError("Face is not enrolled", { status: 404 });
  const image = await readFaceImage(event);
  try {
    await detectSingleFace(image);
    const result = await compareFace(image, referenceFaceToken(template.templateRef));
    await auditProfileAction({ userId: session.userId, sessionId: session.id,
      eventType: "face.compare", success: result.matched });
    // A still image has no PAD/liveness proof. This result never elevates the session.
    return { ...result, livenessVerified: false };
  } catch (error) {
    await auditProfileAction({ userId: session.userId, sessionId: session.id,
      eventType: "face.compare", success: false });
    throw error;
  }
});
