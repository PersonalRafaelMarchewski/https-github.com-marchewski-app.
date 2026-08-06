-- Nível de treinamento do aluno (iniciante/intermediario/avancado).
-- Rode no SQL Editor do Supabase.

alter table students add column if not exists level text default 'intermediario';
