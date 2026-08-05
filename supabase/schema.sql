-- Marchewski App — schema + RLS
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Idempotente: pode ser rodado de novo com segurança caso uma execução
-- anterior tenha parado no meio (ex: uma tabela já existia).

-- Perfis (personal e aluno compartilham a mesma tabela, diferenciados por role)
create table if not exists profiles (
  id uuid primary key references auth.users(id),
  role text not null check (role in ('trainer', 'student')),
  name text not null,
  email text not null,
  avatar_url text,
  created_at timestamp default now()
);

-- Alunos vinculados a um personal
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references profiles(id),
  profile_id uuid references profiles(id),
  phone text,
  birth_date date,
  goal text,
  status text default 'active' check (status in ('active', 'inactive')),
  anamnesis jsonb, -- anamnese digital preenchida pelo aluno
  stripe_customer_id text,
  subscription_status text,
  created_at timestamp default now()
);

-- Biblioteca de exercícios
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle_group text,
  video_url text,
  instructions text
);

-- Treinos (um "programa" atribuído a um aluno)
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references profiles(id),
  student_id uuid references students(id),
  name text not null,
  start_date date,
  end_date date,
  status text default 'active' check (status in ('active', 'completed', 'draft'))
);

-- Exercícios dentro de um treino
create table if not exists workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid references workouts(id),
  exercise_id uuid references exercises(id),
  label text not null default 'A', -- Treino A, B, C... (rotação livre, sem dia fixo)
  sets int,
  reps text,                -- texto pois pode ser "8-12"
  load text,                -- ex: "20kg" ou "peso corporal"
  rest_seconds int,
  order_index int
);

-- Execução/feedback do aluno
create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid references workout_exercises(id),
  student_id uuid references students(id),
  date date default current_date,
  completed boolean default false,
  difficulty_rating int check (difficulty_rating between 1 and 5),
  feedback_text text,
  video_path text, -- vídeo do set gravado pelo aluno (bucket exercise-videos)
  trainer_feedback_text text,
  trainer_rating int check (trainer_rating between 1 and 5),
  created_at timestamp default now()
);

-- Avaliações físicas (fase 2)
create table if not exists evaluations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  date date default current_date,
  weight numeric,
  body_fat numeric,
  measurements jsonb,
  notes text
);

-- Inscrições de notificação push (fase 3)
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamp default now()
);

-- Pagamentos via Stripe (fase 3)
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  trainer_id uuid references profiles(id),
  type text not null check (type in ('subscription', 'one_time')),
  amount_cents integer not null,
  currency text not null default 'brl',
  description text,
  stripe_checkout_session_id text unique,
  stripe_subscription_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'active', 'canceled', 'failed')),
  created_at timestamp default now(),
  paid_at timestamp
);

-- ---------------------------------------------------------------------
-- Row Level Security
-- O client usa a anon key direto do browser, então cada tabela precisa
-- de policies restringindo o acesso ao personal dono do dado e ao
-- aluno dono do próprio registro.
-- ---------------------------------------------------------------------

alter table profiles enable row level security;
alter table students enable row level security;
alter table exercises enable row level security;
alter table workouts enable row level security;
alter table workout_exercises enable row level security;
alter table workout_logs enable row level security;
alter table evaluations enable row level security;

-- profiles: cada um vê o próprio perfil; o personal também vê o perfil dos seus alunos
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select
  using (
    id = auth.uid()
    or id in (select profile_id from students where trainer_id = auth.uid())
  );

drop policy if exists "profiles_insert_self" on profiles;
create policy "profiles_insert_self" on profiles for insert
  with check (id = auth.uid());

drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self" on profiles for update
  using (id = auth.uid());

-- students: dono é o personal; o aluno enxerga só o próprio registro
drop policy if exists "students_select" on students;
create policy "students_select" on students for select
  using (trainer_id = auth.uid() or profile_id = auth.uid());

drop policy if exists "students_insert" on students;
create policy "students_insert" on students for insert
  with check (trainer_id = auth.uid());

drop policy if exists "students_update" on students;
create policy "students_update" on students for update
  using (trainer_id = auth.uid());

-- aluno pode atualizar a própria linha (usado hoje pra salvar a anamnese)
drop policy if exists "students_update_self" on students;
create policy "students_update_self" on students for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "students_delete" on students;
create policy "students_delete" on students for delete
  using (trainer_id = auth.uid());

-- exercises: biblioteca compartilhada, leitura para qualquer usuário autenticado
drop policy if exists "exercises_select" on exercises;
create policy "exercises_select" on exercises for select
  to authenticated using (true);

drop policy if exists "exercises_write" on exercises;
create policy "exercises_write" on exercises for all
  to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'trainer'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'trainer'));

-- workouts: personal dono ou aluno atribuído
drop policy if exists "workouts_select" on workouts;
create policy "workouts_select" on workouts for select
  using (
    trainer_id = auth.uid()
    or student_id in (select id from students where profile_id = auth.uid())
  );

drop policy if exists "workouts_insert" on workouts;
create policy "workouts_insert" on workouts for insert
  with check (trainer_id = auth.uid());

drop policy if exists "workouts_update" on workouts;
create policy "workouts_update" on workouts for update
  using (trainer_id = auth.uid());

drop policy if exists "workouts_delete" on workouts;
create policy "workouts_delete" on workouts for delete
  using (trainer_id = auth.uid());

-- workout_exercises: segue a dono do treino
drop policy if exists "workout_exercises_select" on workout_exercises;
create policy "workout_exercises_select" on workout_exercises for select
  using (
    workout_id in (
      select id from workouts
      where trainer_id = auth.uid()
         or student_id in (select id from students where profile_id = auth.uid())
    )
  );

drop policy if exists "workout_exercises_write" on workout_exercises;
create policy "workout_exercises_write" on workout_exercises for all
  using (workout_id in (select id from workouts where trainer_id = auth.uid()))
  with check (workout_id in (select id from workouts where trainer_id = auth.uid()));

-- workout_logs: aluno registra o próprio progresso; o personal só lê
drop policy if exists "workout_logs_select" on workout_logs;
create policy "workout_logs_select" on workout_logs for select
  using (
    student_id in (select id from students where profile_id = auth.uid())
    or student_id in (select id from students where trainer_id = auth.uid())
  );

drop policy if exists "workout_logs_insert" on workout_logs;
create policy "workout_logs_insert" on workout_logs for insert
  with check (student_id in (select id from students where profile_id = auth.uid()));

drop policy if exists "workout_logs_update" on workout_logs;
create policy "workout_logs_update" on workout_logs for update
  using (student_id in (select id from students where profile_id = auth.uid()));

-- o personal também atualiza o log (pra salvar a própria nota/comentário)
drop policy if exists "workout_logs_update_trainer" on workout_logs;
create policy "workout_logs_update_trainer" on workout_logs for update
  using (student_id in (select id from students where trainer_id = auth.uid()));

-- evaluations: personal registra, ambos leem
drop policy if exists "evaluations_select" on evaluations;
create policy "evaluations_select" on evaluations for select
  using (
    student_id in (select id from students where profile_id = auth.uid())
    or student_id in (select id from students where trainer_id = auth.uid())
  );

drop policy if exists "evaluations_write" on evaluations;
create policy "evaluations_write" on evaluations for all
  using (student_id in (select id from students where trainer_id = auth.uid()))
  with check (student_id in (select id from students where trainer_id = auth.uid()));

-- push_subscriptions: cada usuário só vê/gerencia a própria inscrição
alter table push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_self" on push_subscriptions;
create policy "push_subscriptions_select_self" on push_subscriptions for select
  using (profile_id = auth.uid());

drop policy if exists "push_subscriptions_insert_self" on push_subscriptions;
create policy "push_subscriptions_insert_self" on push_subscriptions for insert
  with check (profile_id = auth.uid());

drop policy if exists "push_subscriptions_delete_self" on push_subscriptions;
create policy "push_subscriptions_delete_self" on push_subscriptions for delete
  using (profile_id = auth.uid());

-- payments: trainer vê/gerencia os das próprias alunos; aluno só vê os próprios
alter table payments enable row level security;

drop policy if exists "payments_select" on payments;
create policy "payments_select" on payments for select
  using (
    student_id in (select id from students where profile_id = auth.uid())
    or trainer_id = auth.uid()
  );

drop policy if exists "payments_insert" on payments;
create policy "payments_insert" on payments for insert
  with check (trainer_id = auth.uid());

drop policy if exists "payments_update_trainer" on payments;
create policy "payments_update_trainer" on payments for update
  using (trainer_id = auth.uid());
