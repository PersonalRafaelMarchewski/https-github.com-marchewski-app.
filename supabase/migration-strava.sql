-- Integração com o Strava: cardio feito na rua marca a ficha sozinho.
--
-- O aluno conecta a conta do Strava no perfil dele (OAuth). Quando ele
-- registra uma corrida/pedal/caminhada lá, o Strava avisa o app por
-- webhook, o app busca a atividade e marca o exercício de cardio do dia
-- como concluído, com o resumo real (ex: "Corrida · 5,2 km · 31min").
--
-- Rode no SQL Editor do Supabase.

-- Tokens de acesso do aluno no Strava. SENSÍVEL: RLS ligada e NENHUMA
-- policy — ninguém acessa via anon key, nem o próprio aluno; quem lê e
-- escreve é sempre o servidor com a service_role (rotas /api/strava/* e
-- o webhook). Mesmo padrão da auth_attempts.
create table if not exists strava_connections (
  profile_id uuid primary key references profiles(id) on delete cascade,
  strava_athlete_id bigint not null unique,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  connected_at timestamptz not null default now()
);

alter table strava_connections enable row level security;

-- Atividades sincronizadas — id é o próprio id da atividade no Strava
-- (evita duplicar quando o webhook reentrega o mesmo evento).
create table if not exists strava_activities (
  id bigint primary key,
  student_id uuid not null references students(id) on delete cascade,
  type text,
  name text,
  distance_m numeric,
  moving_time_s int,
  activity_date date,
  created_at timestamptz not null default now()
);

alter table strava_activities enable row level security;

-- leitura: o aluno vê as próprias, o personal vê as dos seus alunos.
-- escrita: só o servidor (service_role) — nenhuma policy de insert/update.
drop policy if exists "strava_activities_select" on strava_activities;
create policy "strava_activities_select" on strava_activities for select
  using (
    student_id in (select id from students where profile_id = auth.uid())
    or student_id in (select id from students where trainer_id = auth.uid())
  );

create index if not exists strava_activities_student_date_idx
  on strava_activities (student_id, activity_date desc);

NOTIFY pgrst, 'reload schema';
