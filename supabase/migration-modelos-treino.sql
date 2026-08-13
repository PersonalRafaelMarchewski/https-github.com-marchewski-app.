-- Modelos de treino prontos: o personal monta um treino do zero uma vez,
-- salva como modelo, e depois reaproveita ele pra montar rápido o treino
-- de qualquer outro aluno (só escolhe o modelo, os exercícios entram
-- sozinhos). Rode no SQL Editor do Supabase.

create table if not exists workout_templates (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references profiles(id) not null,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists workout_templates_trainer_idx on workout_templates (trainer_id, created_at desc);

create table if not exists workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references workout_templates(id) on delete cascade not null,
  exercise_id uuid references exercises(id) not null,
  label text not null default 'A',
  sets int,
  reps text,
  load text,
  rest_seconds int,
  method text,
  order_index int not null default 0
);

create index if not exists workout_template_exercises_template_idx
  on workout_template_exercises (template_id, order_index);

alter table workout_templates enable row level security;

drop policy if exists "workout_templates_select" on workout_templates;
create policy "workout_templates_select" on workout_templates for select
  using (trainer_id = auth.uid());

drop policy if exists "workout_templates_insert" on workout_templates;
create policy "workout_templates_insert" on workout_templates for insert
  with check (trainer_id = auth.uid());

drop policy if exists "workout_templates_delete" on workout_templates;
create policy "workout_templates_delete" on workout_templates for delete
  using (trainer_id = auth.uid());

alter table workout_template_exercises enable row level security;

drop policy if exists "workout_template_exercises_select" on workout_template_exercises;
create policy "workout_template_exercises_select" on workout_template_exercises for select
  using (template_id in (select id from workout_templates where trainer_id = auth.uid()));

drop policy if exists "workout_template_exercises_insert" on workout_template_exercises;
create policy "workout_template_exercises_insert" on workout_template_exercises for insert
  with check (template_id in (select id from workout_templates where trainer_id = auth.uid()));

drop policy if exists "workout_template_exercises_delete" on workout_template_exercises;
create policy "workout_template_exercises_delete" on workout_template_exercises for delete
  using (template_id in (select id from workout_templates where trainer_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
