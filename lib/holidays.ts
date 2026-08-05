// Feriados nacionais + estaduais de São Paulo, calculados sob demanda (sem
// depender de API externa). Datas móveis (Carnaval, Páscoa, Corpus Christi)
// usam o algoritmo padrão de cálculo da Páscoa.

function toKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Algoritmo de Meeus/Jones/Butcher (calendário gregoriano)
function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = março, 4 = abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function getHolidaysForYear(year: number): Record<string, string> {
  const easter = getEaster(year);

  const holidays: Record<string, string> = {
    [`${year}-01-01`]: "Confraternização Universal",
    [`${year}-04-21`]: "Tiradentes",
    [`${year}-05-01`]: "Dia do Trabalho",
    [`${year}-09-07`]: "Independência do Brasil",
    [`${year}-10-12`]: "Nossa Senhora Aparecida",
    [`${year}-11-02`]: "Finados",
    [`${year}-11-15`]: "Proclamação da República",
    [`${year}-11-20`]: "Consciência Negra",
    [`${year}-12-25`]: "Natal",
    // estadual — São Paulo
    [`${year}-07-09`]: "Revolução Constitucionalista (SP)",
  };

  holidays[toKey(addDays(easter, -48))] = "Carnaval";
  holidays[toKey(addDays(easter, -47))] = "Carnaval";
  holidays[toKey(addDays(easter, -2))] = "Sexta-feira Santa";
  holidays[toKey(addDays(easter, 60))] = "Corpus Christi";

  return holidays;
}

// Cache simples por ano — evita recalcular a Páscoa toda hora
const cache = new Map<number, Record<string, string>>();

export function getHolidayName(dateKey: string): string | null {
  const year = Number(dateKey.slice(0, 4));
  if (!cache.has(year)) {
    cache.set(year, getHolidaysForYear(year));
  }
  return cache.get(year)![dateKey] ?? null;
}
