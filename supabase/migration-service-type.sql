-- Tipo de serviço do aluno (Assessoria x Personal), pra facilitar o
-- agrupamento na lista de alunos e no agendamento de aulas.
-- Rode este arquivo inteiro no SQL Editor do Supabase.

alter table students
  add column if not exists service_type text default 'assessoria';

update students set service_type = 'assessoria' where service_type is null;

alter table students
  drop constraint if exists students_service_type_check;

alter table students
  add constraint students_service_type_check
  check (service_type in ('assessoria', 'personal'));
