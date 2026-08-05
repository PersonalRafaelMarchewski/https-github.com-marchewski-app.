-- Lembretes na agenda: uma nota num dia específico (ex: "renovar CREF")
-- ou um aviso de período fechado (ex: "Férias" de uma data até outra).
-- Sempre só um aviso visual — nunca impede de criar uma aula no período.
-- Rode no SQL Editor do Supabase.

create table if not exists agenda_reminders (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references profiles(id) not null,
  start_date date not null,
  end_date date not null,
  title text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists agenda_reminders_trainer_dates_idx
  on agenda_reminders (trainer_id, start_date, end_date);

alter table agenda_reminders enable row level security;

drop policy if exists "agenda_reminders_select" on agenda_reminders;
create policy "agenda_reminders_select" on agenda_reminders for select
  using (trainer_id = auth.uid());

drop policy if exists "agenda_reminders_insert" on agenda_reminders;
create policy "agenda_reminders_insert" on agenda_reminders for insert
  with check (trainer_id = auth.uid());

drop policy if exists "agenda_reminders_update" on agenda_reminders;
create policy "agenda_reminders_update" on agenda_reminders for update
  using (trainer_id = auth.uid());

drop policy if exists "agenda_reminders_delete" on agenda_reminders;
create policy "agenda_reminders_delete" on agenda_reminders for delete
  using (trainer_id = auth.uid());
