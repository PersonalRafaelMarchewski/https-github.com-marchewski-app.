// O servidor (Vercel) roda em UTC. Sem isso, das 21h à meia-noite no
// horário de Brasília o servidor já considera "amanhã" (UTC adianta 3h),
// fazendo treino feito à noite salvar/aparecer no dia errado. Toda vez
// que o código precisar da data ou hora "de hoje", usa essas funções em
// vez de `new Date().toISOString()` puro.
const BRAZIL_TZ = "America/Sao_Paulo";

export function todayInBrazil(): string {
  // en-CA formata como YYYY-MM-DD, igual ao formato que o banco espera.
  return new Date().toLocaleDateString("en-CA", { timeZone: BRAZIL_TZ });
}

export function dateInBrazil(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: BRAZIL_TZ });
}

export function formatTimeInBrazil(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BRAZIL_TZ,
  });
}
