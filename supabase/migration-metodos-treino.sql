-- Métodos de treino (bi-set, tri-set, drop-set, etc.) por exercício.
-- Rode no SQL Editor do Supabase.

alter table workout_exercises add column if not exists method text;
