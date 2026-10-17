import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { compareFace, createFaceSet, deleteFaceSet, detectSingleFace } from "../server/services/face/facepp.ts";

const originalFetch = globalThis.fetch;
const originalKey = process.env.FACE_API_KEY;
const originalSecret = process.env.FACE_API_SECRET;
const originalDb = process.env.DATABASE_URL;
const originalRedis = process.env.REDIS_URL;

before(() => {
  process.env.DATABASE_URL = "postgres://test:pass@localhost/test";
  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.FACE_API_KEY = "test-key";
  process.env.FACE_API_SECRET = "test-secret";
});

after(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries({
    FACE_API_KEY: originalKey, FACE_API_SECRET: originalSecret,
    DATABASE_URL: originalDb, REDIS_URL: originalRedis,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const image = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" });

test("Face++ requests keep credentials server-side and reject ambiguous faces", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return Response.json({ faces: [{ face_token: "reference", attributes: { facequality: { value: 80, threshold: 70 } } }] });
  };
  assert.equal(await detectSingleFace(image), "reference");
  assert.equal(calls[0].url, "https://api-us.faceplusplus.com/facepp/v3/detect");
  assert.equal(calls[0].options.body.get("api_key"), "test-key");
  assert.equal(calls[0].options.body.get("api_secret"), "test-secret");
  assert.equal(calls[0].options.body.get("return_attributes"), "facequality");

  globalThis.fetch = async () => Response.json({ faces: [{ face_token: "a" }, { face_token: "b" }] });
  await assert.rejects(() => detectSingleFace(image), /Exactly one face/);
});

test("Face++ match uses provider threshold and fails closed on malformed replies", async () => {
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.body.get("face_token2"), "reference");
    return Response.json({ faces1: [{ face_token: "probe" }], confidence: 69, thresholds: { "1e-4": 70 } });
  };
  assert.deepEqual(await compareFace(image, "reference"), { matched: false, confidence: 69, threshold: 70 });
  globalThis.fetch = async () => Response.json({ confidence: 99, thresholds: { "1e-4": 70 } });
  await assert.rejects(() => compareFace(image, "reference"), /Invalid Face\+\+ comparison/);
});

test("FaceSet is created and deleted through Face++", async () => {
  const paths = [];
  globalThis.fetch = async (url, options) => {
    paths.push(new URL(url).pathname);
    if (url.endsWith("/create")) {
      assert.equal(options.body.get("face_tokens"), "reference");
      return Response.json({ faceset_token: "set-1", face_added: 1 });
    }
    assert.equal(options.body.get("faceset_token"), "set-1");
    return Response.json({ faceset_token: "set-1" });
  };
  assert.equal(await createFaceSet("reference"), "set-1");
  await deleteFaceSet("set-1");
  assert.deepEqual(paths, ["/facepp/v3/faceset/create", "/facepp/v3/faceset/delete"]);
});

test("missing Face++ secret never sends a request", async () => {
  delete process.env.FACE_API_SECRET;
  globalThis.fetch = async () => { throw new Error("must not call Face++"); };
  await assert.rejects(() => detectSingleFace(image), /Face\+\+ is not configured/);
  process.env.FACE_API_SECRET = "test-secret";
});
