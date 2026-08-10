-- Exercício alternativo (ex: máquina ocupada/indisponível na academia) —
-- cadastrado na biblioteca, com opção de troca na hora do treino. Rode no
-- SQL Editor do Supabase.

create table if not exists exercise_alternatives (
  exercise_id uuid not null references exercises(id) on delete cascade,
  alternative_exercise_id uuid not null references exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (exercise_id, alternative_exercise_id)
);

alter table exercise_alternatives enable row level security;

-- mesma regra da biblioteca de exercícios: qualquer autenticado lê (aluno
-- precisa ver as alternativas), só o personal cadastra/edita
drop policy if exists "exercise_alternatives_select" on exercise_alternatives;
create policy "exercise_alternatives_select" on exercise_alternatives for select
  to authenticated using (true);

drop policy if exists "exercise_alternatives_write" on exercise_alternatives;
create policy "exercise_alternatives_write" on exercise_alternatives for all
  to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'trainer'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'trainer'));

-- quando o aluno troca pra alternativa durante o treino, o registro
-- (histórico, carga, PR) passa a valer pro exercício que ele realmente fez
alter table workout_logs add column if not exists substituted_exercise_id uuid references exercises(id);
