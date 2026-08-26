-- Compromissos na agenda: eventos sem aluno (reunião, dentista, bloqueio de
-- horário etc.), criados e editados igual às aulas. A única mudança de schema
-- é permitir student_id nulo — RLS já é por trainer_id, nada mais muda.
-- Rode este arquivo inteiro no SQL Editor do Supabase.

alter table training_sessions alter column student_id drop not null;
