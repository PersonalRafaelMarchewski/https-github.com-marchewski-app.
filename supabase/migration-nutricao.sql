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

-- Tabela TACO (composição de alimentos, NEPA-UNICAMP) — o personal escolhe
-- o alimento e a quantidade na hora de montar a refeição, e o valor
-- nutricional entra sozinho (calculado a partir do valor por 100g).
create table if not exists foods (
  id uuid primary key default gen_random_uuid(),
  taco_id int unique, -- id original da tabela TACO, evita duplicar no seed
  name text not null,
  category text,
  calories_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fat_per_100g numeric,
  fiber_per_100g numeric,
  sodium_per_100g numeric,
  created_at timestamptz not null default now()
);

create index if not exists foods_name_idx on foods (name);

alter table foods enable row level security;

drop policy if exists "foods_select" on foods;
create policy "foods_select" on foods for select
  to authenticated using (true);

drop policy if exists "foods_write" on foods;
create policy "foods_write" on foods for all
  to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'trainer'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'trainer'));

-- registra quais alimentos (e em que quantidade) compõem cada refeição —
-- assim dá pra reabrir a refeição depois e ver/editar os alimentos
-- escolhidos, não só o total calculado.
create table if not exists diet_meal_foods (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid references diet_meals(id) on delete cascade not null,
  food_id uuid references foods(id) not null,
  quantity_g numeric not null,
  order_index int not null default 0
);

create index if not exists diet_meal_foods_meal_idx on diet_meal_foods (meal_id, order_index);

alter table diet_meal_foods enable row level security;

drop policy if exists "diet_meal_foods_select" on diet_meal_foods;
create policy "diet_meal_foods_select" on diet_meal_foods for select
  using (
    meal_id in (
      select id from diet_meals where plan_id in (
        select id from diet_plans where trainer_id = auth.uid()
        or student_id in (select id from students where profile_id = auth.uid())
      )
    )
  );

drop policy if exists "diet_meal_foods_write" on diet_meal_foods;
create policy "diet_meal_foods_write" on diet_meal_foods for all
  using (
    meal_id in (
      select id from diet_meals where plan_id in (
        select id from diet_plans where trainer_id = auth.uid()
      )
    )
  )
  with check (
    meal_id in (
      select id from diet_meals where plan_id in (
        select id from diet_plans where trainer_id = auth.uid()
      )
    )
  );

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
