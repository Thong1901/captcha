import { defineHandler } from "nitro";

export default defineHandler((event) => {
  return {
    message: "Nitro CAPTCHA workspace is ready",
    timestamp: new Date().toISOString(),
  };
});
