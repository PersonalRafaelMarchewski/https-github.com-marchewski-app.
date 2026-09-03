-- Painel de renovação (estilo Trello): "adiar" um aluno no quadro por 7 dias
-- sem precisar renovar a ficha na hora — o card sai das colunas urgentes e
-- volta a aparecer quando o prazo do adiamento passar.
-- Rode este arquivo inteiro no SQL Editor do Supabase.

create table if not exists renewal_snoozes (
  student_id uuid primary key references students(id) on delete cascade,
  trainer_id uuid references profiles(id) not null,
  snoozed_until date not null,
  created_at timestamptz not null default now()
);

alter table renewal_snoozes enable row level security;

drop policy if exists "renewal_snoozes_trainer_all" on renewal_snoozes;
create policy "renewal_snoozes_trainer_all" on renewal_snoozes for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

NOTIFY pgrst, 'reload schema';
