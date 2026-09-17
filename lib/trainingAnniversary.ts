// Aniversário de treino: marcos de tempo desde o início do contrato/treino
// (1, 3, 6 meses, depois a cada ano) — mesmo espírito do aniversário de
// nascimento (lib de feriados/aniversário já existe pro calendário), só que
// contando a partir de `training_start_date` em vez do dia de nascimento.

const EARLY_MILESTONES_MONTHS = [1, 3, 6];

// Rótulo do marco, ou null se esse número de meses não é um marco
// comemorado (1, 3, 6 meses; depois 12, 24, 36... — qualquer ano fechado).
export function milestoneLabel(monthsElapsed: number): string | null {
  if (monthsElapsed <= 0) return null;
  if (EARLY_MILESTONES_MONTHS.includes(monthsElapsed)) {
    return `${monthsElapsed} ${monthsElapsed === 1 ? "mês" : "meses"}`;
  }
  if (monthsElapsed % 12 === 0) {
    const anos = monthsElapsed / 12;
    return `${anos} ${anos === 1 ? "ano" : "anos"} de treino`;
  }
  return null;
}

function parseDateOnly(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m: m - 1, d }; // m em 0-11, igual Date.getMonth()
}

// Dia do mês "clampado": início dia 31 + mês-alvo com só 30 dias = cai no
// dia 30 (mesmo truque que já usamos pra aniversário mensal na agenda).
function clampedDay(y: number, m: number, day: number): number {
  const lastDay = new Date(y, m + 1, 0).getDate();
  return Math.min(day, lastDay);
}

// Se `targetDateStr` é o dia exato de um marco a partir de `startDateStr`,
// devolve o rótulo do marco (ex: "6 meses"); senão null. Datas em
// "YYYY-MM-DD", sem fuso — mesmo formato usado no resto da agenda.
export function milestoneForDate(startDateStr: string, targetDateStr: string): string | null {
  const start = parseDateOnly(startDateStr);
  const target = parseDateOnly(targetDateStr);

  const monthsElapsed = (target.y - start.y) * 12 + (target.m - start.m);
  if (monthsElapsed <= 0) return null;

  const expectedDay = clampedDay(start.y + Math.floor((start.m + monthsElapsed) / 12), (start.m + monthsElapsed) % 12, start.d);
  if (target.d !== expectedDay) return null;

  return milestoneLabel(monthsElapsed);
}

// Texto amigável de "tempo treinando" pra hoje (painel do aluno), tipo
// "1 ano e 3 meses" ou "8 meses" ou "12 dias".
export function tenureLabel(startDateStr: string, todayStr: string): string {
  const start = parseDateOnly(startDateStr);
  const today = parseDateOnly(todayStr);

  let months = (today.y - start.y) * 12 + (today.m - start.m);
  if (today.d < start.d) months -= 1;
  if (months <= 0) {
    const days = Math.max(
      0,
      Math.round((new Date(today.y, today.m, today.d).getTime() - new Date(start.y, start.m, start.d).getTime()) / 86_400_000)
    );
    return days <= 1 ? "hoje" : `${days} dias`;
  }
  const anos = Math.floor(months / 12);
  const meses = months % 12;
  if (anos === 0) return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  if (meses === 0) return `${anos} ${anos === 1 ? "ano" : "anos"}`;
  return `${anos} ${anos === 1 ? "ano" : "anos"} e ${meses} ${meses === 1 ? "mês" : "meses"}`;
}
