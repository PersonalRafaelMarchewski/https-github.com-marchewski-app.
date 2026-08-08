-- Separa Assessoria x Personal na aba Finanças (cada um com sua receita,
-- despesa e meta, como se fossem 2 empresas). Rode no SQL Editor do Supabase.

alter table finance_entries
  add column if not exists business text not null default 'assessoria'
  check (business in ('assessoria', 'personal'));

-- a meta única do mês vira uma meta por negócio
alter table finance_settings
  drop column if exists monthly_goal_cents;

alter table finance_settings
  add column if not exists assessoria_goal_cents integer,
  add column if not exists personal_goal_cents integer;
