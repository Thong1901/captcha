import { defineHandler } from "nitro";
import { limitFaceRequest, requireFaceSession } from "../../services/face/request.ts";
import { revokeFace } from "../../services/face/template.ts";
import { auditProfileAction } from "../../services/profiles/access.ts";

export default defineHandler(async (event) => {
  const session = await requireFaceSession(event, true);
  await limitFaceRequest(session.userId);
  await revokeFace(session.userId);
  await auditProfileAction({ userId: session.userId, sessionId: session.id,
    eventType: "face.revoke", success: true });
  return { enrolled: false };
});
