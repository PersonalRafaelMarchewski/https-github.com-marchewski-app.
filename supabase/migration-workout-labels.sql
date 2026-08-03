-- Troca o modelo de "dia da semana fixo" por "rotação livre" (Treino A, B, C...).
-- Rode no SQL Editor do Supabase.

alter table workout_exercises drop column if exists day_of_week;
alter table workout_exercises add column if not exists label text not null default 'A';
