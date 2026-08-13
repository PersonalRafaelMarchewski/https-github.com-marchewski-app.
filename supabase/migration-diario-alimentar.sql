-- Diário alimentar livre: além das refeições prescritas pelo personal
-- (diet_meals/diet_logs), o aluno pode registrar TUDO que comeu no dia,
-- escolhendo alimento + quantidade da Tabela TACO (mesmo padrão já usado
-- na prescrição). Isso alimenta um "quanto falta pra bater a meta hoje"
-- em tempo real, e um gráfico de quando a pessoa mais come ao longo do
-- dia. Inspirado no app Alimente-se, sem a parte de foto/IA por enquanto.
-- Rode no SQL Editor do Supabase.

create table if not exists diet_diary_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) not null,
  date date not null,
  label text, -- opcional, ex: "Lanche da tarde" — livre, sem vínculo com o plano
  logged_at timestamptz not null default now(), -- guarda o horário real, pro gráfico por hora
  created_at timestamptz not null default now()
);

create index if not exists diet_diary_entries_student_date_idx
  on diet_diary_entries (student_id, date);

create table if not exists diet_diary_entry_foods (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references diet_diary_entries(id) on delete cascade not null,
  food_id uuid references foods(id) not null,
  quantity_g numeric not null,
  order_index int not null default 0
);

create index if not exists diet_diary_entry_foods_entry_idx
  on diet_diary_entry_foods (entry_id, order_index);

create table if not exists water_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) not null,
  date date not null,
  amount_ml int not null,
  created_at timestamptz not null default now()
);

create index if not exists water_logs_student_date_idx on water_logs (student_id, date);

-- RLS: aluno gerencia só o próprio diário/água; personal só lê (acompanha),
-- mesmo padrão de diet_logs.

alter table diet_diary_entries enable row level security;

drop policy if exists "diet_diary_entries_select" on diet_diary_entries;
create policy "diet_diary_entries_select" on diet_diary_entries for select
  using (
    student_id in (select id from students where profile_id = auth.uid())
    or student_id in (select id from students where trainer_id = auth.uid())
  );

drop policy if exists "diet_diary_entries_insert" on diet_diary_entries;
create policy "diet_diary_entries_insert" on diet_diary_entries for insert
  with check (student_id in (select id from students where profile_id = auth.uid()));

drop policy if exists "diet_diary_entries_delete" on diet_diary_entries;
create policy "diet_diary_entries_delete" on diet_diary_entries for delete
  using (student_id in (select id from students where profile_id = auth.uid()));

alter table diet_diary_entry_foods enable row level security;

drop policy if exists "diet_diary_entry_foods_select" on diet_diary_entry_foods;
create policy "diet_diary_entry_foods_select" on diet_diary_entry_foods for select
  using (
    entry_id in (
      select id from diet_diary_entries
      where student_id in (select id from students where profile_id = auth.uid())
      or student_id in (select id from students where trainer_id = auth.uid())
    )
  );

drop policy if exists "diet_diary_entry_foods_insert" on diet_diary_entry_foods;
create policy "diet_diary_entry_foods_insert" on diet_diary_entry_foods for insert
  with check (
    entry_id in (
      select id from diet_diary_entries
      where student_id in (select id from students where profile_id = auth.uid())
    )
  );

alter table water_logs enable row level security;

drop policy if exists "water_logs_select" on water_logs;
create policy "water_logs_select" on water_logs for select
  using (
    student_id in (select id from students where profile_id = auth.uid())
    or student_id in (select id from students where trainer_id = auth.uid())
  );

drop policy if exists "water_logs_insert" on water_logs;
create policy "water_logs_insert" on water_logs for insert
  with check (student_id in (select id from students where profile_id = auth.uid()));

drop policy if exists "water_logs_delete" on water_logs;
create policy "water_logs_delete" on water_logs for delete
  using (student_id in (select id from students where profile_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
