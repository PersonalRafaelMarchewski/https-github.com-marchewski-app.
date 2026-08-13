-- Alimentos escolhidos de verdade quando o aluno marca uma refeição
-- prescrita como feita — antes só existia um campo de texto livre
-- ("actual_food"), agora ele busca o alimento de verdade (mesmo
-- buscador do Diário) e a quantidade entra sozinha. O texto livre
-- continua existindo como observação opcional, não foi removido.
-- Rode no SQL Editor do Supabase.

create table if not exists diet_log_foods (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references diet_logs(id) on delete cascade,
  food_id uuid not null references foods(id),
  quantity_g numeric not null,
  order_index int not null default 0
);

create index if not exists diet_log_foods_log_idx on diet_log_foods (log_id, order_index);

alter table diet_log_foods enable row level security;

-- mesma regra do diet_logs: aluno dono ou personal dele podem ler
drop policy if exists "diet_log_foods_select" on diet_log_foods;
create policy "diet_log_foods_select" on diet_log_foods for select
  using (
    log_id in (
      select id from diet_logs where
        student_id in (select id from students where profile_id = auth.uid())
        or student_id in (select id from students where trainer_id = auth.uid())
    )
  );

-- só o próprio aluno escreve (mesma regra do diet_logs_insert/update)
drop policy if exists "diet_log_foods_write" on diet_log_foods;
create policy "diet_log_foods_write" on diet_log_foods for all
  using (
    log_id in (select id from diet_logs where student_id in (select id from students where profile_id = auth.uid()))
  )
  with check (
    log_id in (select id from diet_logs where student_id in (select id from students where profile_id = auth.uid()))
  );

NOTIFY pgrst, 'reload schema';
