import { defineHandler } from "nitro";
import { HTTPError } from "nitro/h3";
import { createChallenge } from "../../services/captcha/challenge.ts";
import { requireUserSession } from "../../services/profiles/access.ts";
import { findFaceTemplate } from "../../services/face/template.ts";
import { limitFaceRequest } from "../../services/face/request.ts";

export default defineHandler(async (event) => {
  const session = await requireUserSession(event, true);
  if (!await findFaceTemplate(session.userId)) {
    throw new HTTPError("Face enrollment required", { status: 403 });
  }
  await limitFaceRequest(session.userId);
  const challenge = await createChallenge(session.id, "view_military_profile");
  return Response.json(challenge, { headers: { "Cache-Control": "no-store" } });
});
