import { defineHandler } from "nitro";
import { getServerConfig } from "../../utils/config.ts";
import { requireFaceSession } from "../../services/face/request.ts";
import { findFaceTemplate } from "../../services/face/template.ts";

export default defineHandler(async (event) => {
  const session = await requireFaceSession(event);
  const { faceApiKey, faceApiSecret } = getServerConfig();
  return { configured: Boolean(faceApiKey && faceApiSecret), enrolled: Boolean(await findFaceTemplate(session.userId)) };
});
