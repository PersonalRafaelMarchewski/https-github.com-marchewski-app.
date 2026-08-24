-- Cobrança por aluno: mensalidade combinada e dia de vencimento. Com eles,
-- o painel "Quem pagou no mês" mostra quanto cada pendente deve e se já
-- está atrasado, e ganha o botão de cobrar no WhatsApp com mensagem pronta.
--
-- Os três campos de cobrança (is_payer, monthly_fee_cents, due_day) são
-- protegidos pelo MESMO trigger: só o personal dono do aluno altera —
-- o aluno pode atualizar a própria linha (anamnese), mas não o que paga.
-- Esta versão do trigger SUBSTITUI a da migration-aluno-pagante.sql.
--
-- Rode no SQL Editor do Supabase.

alter table students add column if not exists monthly_fee_cents integer
  check (monthly_fee_cents is null or monthly_fee_cents > 0);
alter table students add column if not exists due_day integer
  check (due_day is null or (due_day between 1 and 28));

create or replace function protect_students_is_payer()
returns trigger
language plpgsql
security definer
as $$
begin
  if (
       new.is_payer is distinct from old.is_payer
       or new.monthly_fee_cents is distinct from old.monthly_fee_cents
       or new.due_day is distinct from old.due_day
     )
     and auth.uid() is not null
     and auth.uid() is distinct from old.trainer_id then
    raise exception 'Só o personal pode alterar os dados de cobrança do aluno.';
  end if;
  return new;
end;
$$;

-- o trigger em si já existe (migration-aluno-pagante) e aponta pra função
-- acima — recriar a função basta. Se por acaso ainda não existir:
drop trigger if exists students_protect_is_payer on students;
create trigger students_protect_is_payer
  before update on students
  for each row
  execute function protect_students_is_payer();

NOTIFY pgrst, 'reload schema';
