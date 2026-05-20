import { createAuthSDK } from "@team/auth-sdk";

export const auth = createAuthSDK({
  mode: "web",
  authCenterUrl: import.meta.env.VITE_AUTH_URL || "",
  loginUI: "modal",
});
