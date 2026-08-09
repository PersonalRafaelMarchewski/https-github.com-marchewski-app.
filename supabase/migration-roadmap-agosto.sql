-- Leva de melhorias inspiradas no comparativo com MFIT/Personal Fit
-- (dias fixos por ficha, progresso do programa, nota pós-treino,
-- lembrete de reavaliação). Rode tudo de uma vez no SQL Editor do Supabase.

-- 1) Lembrete de reavaliação física: guarda quando a próxima está prevista
alter table evaluations add column if not exists next_assessment_date date;

-- 2) Nome e dia da semana fixo por ficha (Treino A/B/C dentro de um programa)
create table if not exists workout_labels (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  label text not null,
  name text,
  weekday smallint check (weekday between 0 and 6), -- 0=domingo .. 6=sábado, null = sem dia fixo
  updated_at timestamptz not null default now(),
  unique (workout_id, label)
);

alter table workout_labels enable row level security;

drop policy if exists "workout_labels_all" on workout_labels;
create policy "workout_labels_all" on workout_labels for all
  using (
    workout_id in (select id from workouts where trainer_id = auth.uid())
    or workout_id in (
      select w.id from workouts w
      join students s on s.id = w.student_id
      where s.profile_id = auth.uid()
    )
  )
  with check (
    workout_id in (select id from workouts where trainer_id = auth.uid())
  );

-- 3) Progresso do programa: quantos treinos são previstos no total
alter table workouts add column if not exists planned_sessions int;

-- 4) Registro de "treino concluído" por dia/ficha, com nota de satisfação —
-- alimenta a barra de progresso e o indicador de feedback dos treinos
create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  label text not null,
  session_date date not null,
  completed_exercises int not null default 0,
  total_exercises int not null default 0,
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique (workout_id, label, session_date)
);

alter table workout_sessions enable row level security;

drop policy if exists "workout_sessions_select" on workout_sessions;
create policy "workout_sessions_select" on workout_sessions for select
  using (
    student_id in (select id from students where profile_id = auth.uid())
    or workout_id in (select id from workouts where trainer_id = auth.uid())
  );

drop policy if exists "workout_sessions_insert" on workout_sessions;
create policy "workout_sessions_insert" on workout_sessions for insert
  with check (student_id in (select id from students where profile_id = auth.uid()));

drop policy if exists "workout_sessions_update" on workout_sessions;
create policy "workout_sessions_update" on workout_sessions for update
  using (student_id in (select id from students where profile_id = auth.uid()));
