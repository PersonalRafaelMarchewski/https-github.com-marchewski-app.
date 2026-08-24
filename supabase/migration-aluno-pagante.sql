-- Aluno pagante ou não (bolsista, cortesia, família): quem não paga sai
-- da lista "Quem pagou no mês" do Financeiro — senão aparece eternamente
-- como pendente sem dever nada.
--
-- Só o personal altera isso. A RLS é por linha (o aluno pode atualizar a
-- própria linha pra preencher a anamnese), então a proteção deste CAMPO
-- específico é um trigger: se quem está mudando is_payer não é o personal
-- dono do aluno, a alteração é rejeitada. service_role (scripts/admin do
-- servidor, auth.uid() nulo) continua podendo.
--
-- Rode no SQL Editor do Supabase.

alter table students add column if not exists is_payer boolean not null default true;

create or replace function protect_students_is_payer()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.is_payer is distinct from old.is_payer
     and auth.uid() is not null
     and auth.uid() is distinct from old.trainer_id then
    raise exception 'Só o personal pode alterar se o aluno é pagante.';
  end if;
  return new;
end;
$$;

drop trigger if exists students_protect_is_payer on students;
create trigger students_protect_is_payer
  before update on students
  for each row
  execute function protect_students_is_payer();

NOTIFY pgrst, 'reload schema';
