-- Observação por exercício DENTRO da ficha (por aluno): ex. "executar na
-- máquina de tríceps testa". Diferente do "instructions" da biblioteca
-- (que é global do exercício) — esta vale só naquela ficha daquele aluno.
-- Rode este arquivo inteiro no SQL Editor do Supabase.

alter table workout_exercises add column if not exists notes text;

NOTIFY pgrst, 'reload schema';
