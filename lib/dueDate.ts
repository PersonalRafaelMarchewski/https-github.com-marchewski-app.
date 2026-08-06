// Calcula quantos dias faltam (ou já passaram) até uma data — usado pra
// mostrar o "vencimento" de um treino (data de fim do plano).
export function daysUntil(dateStr: string, referenceDate: Date = new Date()): number {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T12:00:00`); // meio-dia evita virar o dia por fuso
  // floor (não round): today está à meia-noite e target ao meio-dia, uma
  // diferença de "hoje" já dá 0.5 — round arredondaria pra 1 errado.
  return Math.floor((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatDueLabel(days: number): string {
  if (days > 1) return `Vence em ${days} dias`;
  if (days === 1) return "Vence amanhã";
  if (days === 0) return "Vence hoje";
  if (days === -1) return "Venceu ontem";
  return `Venceu há ${Math.abs(days)} dias`;
}
