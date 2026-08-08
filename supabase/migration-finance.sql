-- Controle financeiro (aba Finanças). Rode no SQL Editor do Supabase.

create table if not exists finance_entries (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  description text,
  amount_cents integer not null check (amount_cents > 0),
  entry_date date not null,
  student_id uuid references students(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists finance_entries_trainer_date_idx
  on finance_entries (trainer_id, entry_date);

alter table finance_entries enable row level security;

drop policy if exists "finance_entries_all" on finance_entries;
create policy "finance_entries_all" on finance_entries for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create table if not exists finance_settings (
  trainer_id uuid primary key references profiles(id) on delete cascade,
  monthly_goal_cents integer,
  updated_at timestamptz not null default now()
);

alter table finance_settings enable row level security;

drop policy if exists "finance_settings_all" on finance_settings;
create policy "finance_settings_all" on finance_settings for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());
