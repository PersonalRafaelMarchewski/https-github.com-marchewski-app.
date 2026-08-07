-- Permite o aluno registrar a carga real usada em cada exercício, sem
-- sobrescrever a carga prescrita pelo personal (workout_exercises.load).
-- Rode no SQL Editor do Supabase.

alter table workout_logs add column if not exists actual_load numeric;
