-- Valor de referência da hora/aula do aluno. Não é o que é cobrado (isso
-- continua sendo a mensalidade fechada, em monthly_fee_cents) — é a
-- anotação de quanto vale cada aula, pra bater com contracted_weekly_sessions
-- e entender como a mensalidade foi composta (ex: 4 aulas/sem x R$60 x 4
-- semanas ~ R$960/mês). Uma aula a mais ou a menos no mês não muda a
-- mensalidade fechada.
-- Rode este arquivo inteiro no SQL Editor do Supabase.

alter table students add column if not exists class_rate_cents int
  check (class_rate_cents is null or class_rate_cents >= 0);

NOTIFY pgrst, 'reload schema';
