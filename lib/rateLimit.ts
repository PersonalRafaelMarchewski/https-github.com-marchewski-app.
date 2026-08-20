import "server-only";
import { createHash } from "crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// Quantos cadastros o mesmo IP pode fazer por janela. Generoso de propósito:
// família/academia dividindo a mesma rede tem que conseguir se cadastrar,
// o alvo aqui é robô criando conta em série, não o segundo aluno da casa.
const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 60;

// Guardar IP cru é dado pessoal sem necessidade — o hash conta tentativas
// igual e não permite identificar ninguém a partir do banco.
function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex");
}

async function getClientIp(): Promise<string> {
  const h = await headers();
  // Na Vercel o IP real vem no x-forwarded-for (o primeiro da lista; os
  // seguintes são os proxies pelo caminho).
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "desconhecido";
}

export type RateLimitResult = { allowed: boolean; retryAfterMinutes: number };

// Conta as tentativas recentes desse IP e registra a atual. Se a tabela
// ainda não existir (migração pendente), libera em vez de travar o cadastro
// — a proteção entra sozinha quando a migração rodar.
export async function checkSignupRateLimit(): Promise<RateLimitResult> {
  const ipHash = hashIp(await getClientIp());
  const admin = createAdminClient();
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  const { count, error } = await admin
    .from("signup_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", windowStart);

  if (error) {
    return { allowed: true, retryAfterMinutes: 0 };
  }

  if ((count ?? 0) >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMinutes: WINDOW_MINUTES };
  }

  await admin.from("signup_attempts").insert({ ip_hash: ipHash });

  // limpeza oportunista: sem isso a tabela cresce pra sempre. Roda de vez em
  // quando (1 em 10 cadastros) pra não pagar o custo em toda requisição.
  if (Math.random() < 0.1) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    await admin.from("signup_attempts").delete().lt("created_at", cutoff);
  }

  return { allowed: true, retryAfterMinutes: 0 };
}
