-- Volume contratado do aluno: quantas aulas POR SEMANA ele contratou.
-- O mensal é sempre semanal x 4 (3x/sem = 12/mês) — mês de 5 semanas gera
-- superávit natural, que compensa falta/feriado sem precisar repor.
-- Aparece na aba Presenças: contratado x marcadas x efetivas (saldo).
-- Rode este arquivo inteiro no SQL Editor do Supabase.

alter table students add column if not exists contracted_weekly_sessions int
  check (contracted_weekly_sessions is null or contracted_weekly_sessions between 1 and 7);

NOTIFY pgrst, 'reload schema';
