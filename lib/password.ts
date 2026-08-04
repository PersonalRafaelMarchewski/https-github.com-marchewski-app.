import { randomBytes } from "crypto";

export function generateTempPassword() {
  return randomBytes(6).toString("base64url"); // 8 chars, url-safe
}
