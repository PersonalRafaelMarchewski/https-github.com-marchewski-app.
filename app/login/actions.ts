"use server";

import {
  checkLoginRateLimit,
  recordFailedLogin,
  checkPasswordResetRateLimit,
  type RateLimitResult,
} from "@/lib/rateLimit";

// O login e a recuperação de senha em si continuam client-side (SDK do
// Supabase, ver app/login/page.tsx) — essas actions só existem pra rodar o
// rate limit no servidor antes/depois dessa chamada.

export async function checkLoginAllowed(): Promise<RateLimitResult> {
  return checkLoginRateLimit();
}

export async function reportFailedLogin(): Promise<void> {
  await recordFailedLogin();
}

export async function checkPasswordResetAllowed(): Promise<RateLimitResult> {
  return checkPasswordResetRateLimit();
}
