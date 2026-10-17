import { defineHandler } from "nitro";
import { getServerConfig } from "../../utils/config.ts";

export default defineHandler(() => {
  const { googleClientId, appOrigin } = getServerConfig();
  return { googleClientId, appOrigin, enabled: Boolean(googleClientId) };
});
