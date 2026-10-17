import { defineHandler } from "nitro";
import { HTTPError } from "nitro/h3";
import { enrollFace } from "../../services/face/template.ts";
import { limitFaceRequest, readFaceImage, requireFaceSession } from "../../services/face/request.ts";
import { auditProfileAction } from "../../services/profiles/access.ts";

export default defineHandler(async (event) => {
  const session = await requireFaceSession(event, true);
  if (event.req.headers.get("x-face-consent") !== "yes") {
    throw new HTTPError("Biometric consent required", { status: 400 });
  }
  await limitFaceRequest(session.userId);
  const image = await readFaceImage(event);
  await enrollFace(session.userId, image);
  await auditProfileAction({ userId: session.userId, sessionId: session.id,
    eventType: "face.enroll", success: true });
  return { enrolled: true };
});
