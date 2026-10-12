import { defineHandler } from "nitro";

export default defineHandler(() => {
  return {
    status: "ok",
    service: "captcha-nitro-app",
    timestamp: new Date().toISOString(),
  };
});
