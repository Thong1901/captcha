const { FACE_API_KEY, FACE_API_SECRET } = process.env;
if (!FACE_API_KEY || !FACE_API_SECRET) {
  console.error("FACE_API_KEY and FACE_API_SECRET are required");
  process.exit(1);
}

const form = new FormData();
form.set("api_key", FACE_API_KEY);
form.set("api_secret", FACE_API_SECRET);

try {
  const response = await fetch("https://api-us.faceplusplus.com/facepp/v3/faceset/getfacesets", {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok || result.error_message) {
    const code = String(result.error_message || "HTTP_ERROR").split(":")[0];
    console.error(`Face++ check failed: HTTP ${response.status}, ${code}`);
    process.exitCode = 1;
  } else {
    console.log("Face++ credentials accepted");
  }
} catch (error) {
  console.error(`Face++ connection failed: ${error instanceof Error ? error.name : "UnknownError"}`);
  process.exitCode = 1;
}
