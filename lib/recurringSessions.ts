// Geração de ocorrências semanais recorrentes pra agenda (training_sessions).
// Extraído de app/(trainer)/agenda/actions.ts pra ser reusado também pela
// "agenda automática" do cadastro do aluno (dias/horário fixos de treino).

import { getHolidayName } from "@/lib/holidays";

// trava de segurança pra repetição semanal — só entra em jogo se não houver
// data final, pra não gerar linhas pra sempre. 2 anos dá bastante folga.
export const MAX_OCCURRENCES = 400;
export const NO_END_DATE_YEARS_AHEAD = 2;

export const BRAZIL_OFFSET_HOURS = 3; // UTC = horário do Brasil + 3 (sem horário de verão desde 2019)

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Decompõe um instante UTC nos componentes de data/hora "no relógio do
// Brasil" — sem depender do fuso horário de onde o código está rodando.
export function toBrazilParts(date: Date) {
  const shifted = new Date(date.getTime() - BRAZIL_OFFSET_HOURS * 3600_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

export function brazilPartsToUtc(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number
): Date {
  return new Date(Date.UTC(year, month, day, hours + BRAZIL_OFFSET_HOURS, minutes, 0, 0));
}

// Dia da semana (0=domingo..6=sábado) considerando o relógio do Brasil, não
// o do servidor — senão aulas tarde da noite "viram o dia" em UTC.
export function brazilWeekday(date: Date): number {
  const { year, month, day } = toBrazilParts(date);
  return new Date(Date.UTC(year, month, day)).getUTCDay();
}

// Gera as datas (UTC, já com hora) de todas as ocorrências entre firstStart
// e repeatUntil (ou 2 anos à frente se null) nos dias da semana informados,
// pulando feriados.
export function generateWeeklyOccurrences(
  firstStart: Date,
  weekdays: number[],
  repeatUntil: Date | null
): Date[] {
  const until = repeatUntil ?? addDays(firstStart, 365 * NO_END_DATE_YEARS_AHEAD);
  const occurrenceDates: Date[] = [];
  let cursor = new Date(firstStart);
  let guard = 0;
  while (cursor <= until && guard < MAX_OCCURRENCES) {
    if (weekdays.includes(brazilWeekday(cursor))) {
      const p = toBrazilParts(cursor);
      const diaBR = `${p.year}-${String(p.month + 1).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
      if (!getHolidayName(diaBR)) {
        occurrenceDates.push(new Date(cursor));
        guard++;
      }
    }
    cursor = addDays(cursor, 1);
  }
  return occurrenceDates;
}

// Primeiro dia (no relógio do Brasil, meia-noite) a partir de hoje (inclusive)
// que bate com algum dos dias da semana informados.
//
// cursor precisa ser a meia-noite NO BRASIL (não meia-noite UTC) — senão
// brazilWeekday/toBrazilParts, que sempre voltam 3h, empurram o cursor pro
// dia UTC anterior antes de ler o dia da semana, e a busca acaba
// considerando "ontem" como primeiro candidato (já vimos isso gerar aula
// num dia que já passou).
export function nextWeekdayOnOrAfter(weekdays: number[], fromDate: Date): Date {
  let cursor = brazilPartsToUtc(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate(), 0, 0);
  for (let i = 0; i < 14; i++) {
    if (weekdays.includes(brazilWeekday(cursor))) return cursor;
    cursor = addDays(cursor, 1);
  }
  throw new Error("Nenhum dos dias da semana informados é válido.");
}
