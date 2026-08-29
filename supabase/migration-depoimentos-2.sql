-- Depoimentos, parte 2: a página pública /depoimentos (sem login) também
-- grava no banco, então o aluno pode não estar identificado — student_id
-- vira opcional (fica preenchido quando a pessoa abriu logada no app).
-- Rode no SQL Editor do Supabase.

alter table testimonials alter column student_id drop not null;
