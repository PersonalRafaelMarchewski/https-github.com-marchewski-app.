-- Aba de Nutrição: o personal monta um plano alimentar por aluno, com
-- refeições (café, almoço, lanche, jantar...), cada uma com descrição
-- livre e macros opcionais (calorias/proteína/carbo/gordura). O aluno
-- marca a refeição como feita no dia e pode anotar o que comeu de
-- verdade, se foi diferente do prescrito. Rode no SQL Editor do Supabase.

create table if not exists diet_plans (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references profiles(id) not null,
  student_id uuid references students(id) not null,
  name text not null default 'Plano alimentar',
  status text not null default 'active' check (status in ('active', 'inactive')),
  start_date date,
  end_date date,
  -- metas diárias — opcionais, o personal preenche só se for acompanhar macro
  daily_calories numeric,
  daily_protein numeric,
  daily_carbs numeric,
  daily_fat numeric,
  created_at timestamptz not null default now()
);

create index if not exists diet_plans_student_idx on diet_plans (student_id, status);

create table if not exists diet_meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references diet_plans(id) on delete cascade not null,
  name text not null, -- "Café da manhã", "Almoço", etc — livre
  suggested_time text, -- "08:00", opcional
  description text, -- alimentos e quantidades em texto livre
  calories numeric,
  protein numeric,
  carbs numeric,
  fat numeric,
  order_index int not null default 0
);

create index if not exists diet_meals_plan_idx on diet_meals (plan_id, order_index);

create table if not exists diet_logs (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid references diet_meals(id) on delete cascade not null,
  student_id uuid references students(id) not null,
  date date not null,
  completed boolean not null default false,
  actual_food text, -- o que o aluno comeu de verdade, se quiser registrar
  created_at timestamptz not null default now(),
  unique (meal_id, student_id, date)
);

create index if not exists diet_logs_student_date_idx on diet_logs (student_id, date);

-- RLS: personal gerencia os planos dos próprios alunos; aluno só lê o
-- próprio plano e escreve o próprio log de refeição — mesmo padrão de
-- workouts/workout_exercises/workout_logs.

alter table diet_plans enable row level security;

drop policy if exists "diet_plans_select" on diet_plans;
create policy "diet_plans_select" on diet_plans for select
  using (
    trainer_id = auth.uid()
    or student_id in (select id from students where profile_id = auth.uid())
  );

drop policy if exists "diet_plans_write" on diet_plans;
create policy "diet_plans_write" on diet_plans for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

alter table diet_meals enable row level security;

drop policy if exists "diet_meals_select" on diet_meals;
create policy "diet_meals_select" on diet_meals for select
  using (
    plan_id in (select id from diet_plans where trainer_id = auth.uid())
    or plan_id in (
      select id from diet_plans
      where student_id in (select id from students where profile_id = auth.uid())
    )
  );

drop policy if exists "diet_meals_write" on diet_meals;
create policy "diet_meals_write" on diet_meals for all
  using (plan_id in (select id from diet_plans where trainer_id = auth.uid()))
  with check (plan_id in (select id from diet_plans where trainer_id = auth.uid()));

alter table diet_logs enable row level security;

drop policy if exists "diet_logs_select" on diet_logs;
create policy "diet_logs_select" on diet_logs for select
  using (
    student_id in (select id from students where profile_id = auth.uid())
    or student_id in (select id from students where trainer_id = auth.uid())
  );

drop policy if exists "diet_logs_insert" on diet_logs;
create policy "diet_logs_insert" on diet_logs for insert
  with check (student_id in (select id from students where profile_id = auth.uid()));

drop policy if exists "diet_logs_update" on diet_logs;
create policy "diet_logs_update" on diet_logs for update
  using (student_id in (select id from students where profile_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
