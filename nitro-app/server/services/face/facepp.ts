import { HTTPError } from "nitro/h3";
import { getServerConfig } from "../../utils/config.ts";

const baseUrl = "https://api-us.faceplusplus.com/facepp/v3";

type Face = {
  face_token?: string;
  attributes?: { facequality?: { value?: number; threshold?: number } };
};

async function request(path: string, fields: Record<string, string | Blob>) {
  const { faceApiKey, faceApiSecret } = getServerConfig();
  if (!faceApiKey || !faceApiSecret) {
    throw new HTTPError("Face++ is not configured", { status: 503 });
  }
  const form = new FormData();
  form.set("api_key", faceApiKey);
  form.set("api_secret", faceApiSecret);
  for (const [key, value] of Object.entries(fields)) {
    if (value instanceof Blob) form.set(key, value, "face.jpg");
    else form.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/${path}`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new HTTPError("Face++ is unavailable", { status: 502 });
  }
  let data: Record<string, unknown>;
  try {
    data = await response.json() as Record<string, unknown>;
  } catch {
    throw new HTTPError("Invalid Face++ response", { status: 502 });
  }
  if (!response.ok || typeof data.error_message === "string") {
    console.error("[face++] request failed", { path, status: response.status });
    throw new HTTPError("Face++ could not process the image", { status: 502 });
  }
  return data;
}

export async function detectSingleFace(image: Blob) {
  const data = await request("detect", { image_file: image, return_attributes: "facequality" });
  const faces = data.faces as Face[] | undefined;
  if (!Array.isArray(faces) || faces.length !== 1 || !faces[0]?.face_token) {
    throw new HTTPError("Exactly one face is required", { status: 422 });
  }
  const quality = faces[0].attributes?.facequality;
  if (!quality || typeof quality.value !== "number" || typeof quality.threshold !== "number" ||
      quality.value < quality.threshold) {
    throw new HTTPError("Face image quality is too low", { status: 422 });
  }
  return faces[0].face_token;
}

export async function compareFace(image: Blob, referenceToken: string) {
  const data = await request("compare", { image_file1: image, face_token2: referenceToken });
  const confidence = data.confidence;
  const threshold = (data.thresholds as Record<string, unknown> | undefined)?.["1e-4"];
  const faces = data.faces1 as unknown[] | undefined;
  if (!Array.isArray(faces) || faces.length !== 1 || typeof confidence !== "number" ||
      typeof threshold !== "number" || !Number.isFinite(confidence) || !Number.isFinite(threshold)) {
    throw new HTTPError("Invalid Face++ comparison", { status: 502 });
  }
  return { matched: confidence >= threshold, confidence, threshold };
}

export async function createFaceSet(faceToken: string) {
  const data = await request("faceset/create", { face_tokens: faceToken });
  if (typeof data.faceset_token !== "string" || !data.faceset_token || data.face_added !== 1) {
    throw new HTTPError("Invalid Face++ FaceSet response", { status: 502 });
  }
  return data.faceset_token;
}

export async function deleteFaceSet(faceSetToken: string) {
  const data = await request("faceset/delete", { faceset_token: faceSetToken, check_empty: "0" });
  if (data.faceset_token !== faceSetToken) {
    throw new HTTPError("Invalid Face++ FaceSet response", { status: 502 });
  }
}
