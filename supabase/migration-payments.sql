-- Pagamentos via Stripe. Rode no SQL Editor do Supabase.

alter table students add column if not exists stripe_customer_id text;
alter table students add column if not exists subscription_status text;

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
