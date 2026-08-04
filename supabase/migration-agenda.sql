-- Agenda do personal: aulas marcadas com horário + lembrete automático.
-- Rode este arquivo inteiro no SQL Editor do Supabase.

create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references profiles(id) not null,
  student_id uuid references students(id) not null,
  title text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reminder_minutes_before int not null default 60,
  reminder_sent boolean not null default false,
  recurrence_group_id uuid,
  status text not null default 'scheduled' check (status in ('scheduled', 'canceled', 'done')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists training_sessions_trainer_start_idx
  on training_sessions (trainer_id, start_at);

create index if not exists training_sessions_reminder_idx
  on training_sessions (reminder_sent, start_at)
  where reminder_sent = false;

alter table training_sessions enable row level security;

drop policy if exists "training_sessions_select" on training_sessions;
create policy "training_sessions_select" on training_sessions for select
  using (trainer_id = auth.uid());

drop policy if exists "training_sessions_insert" on training_sessions;
create policy "training_sessions_insert" on training_sessions for insert
  with check (trainer_id = auth.uid());

drop policy if exists "training_sessions_update" on training_sessions;
create policy "training_sessions_update" on training_sessions for update
  using (trainer_id = auth.uid());

drop policy if exists "training_sessions_delete" on training_sessions;
create policy "training_sessions_delete" on training_sessions for delete
  using (trainer_id = auth.uid());

-- ---------------------------------------------------------------------
-- Lembrete automático
-- A Vercel (plano gratuito) só permite cron 1x por dia, o que não serve
-- pra lembrete "X minutos antes". Por isso o agendamento roda aqui dentro
-- do próprio Postgres (pg_cron), chamando a cada minuto uma rota da API
-- que manda a notificação push de quem está na hora.
-- ---------------------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('send-session-reminders')
where exists (select 1 from cron.job where jobname = 'send-session-reminders');

select cron.schedule(
  'send-session-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://marchewski-app.vercel.app/api/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer a8ec5777e644241bc9cfb3c501d4f09349954cb2b17b3a68'
    ),
    body := '{}'::jsonb
  );
  $$
);
