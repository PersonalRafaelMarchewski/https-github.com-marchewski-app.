-- Notificações push. Rode no SQL Editor do Supabase.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamp default now()
);

alter table push_subscriptions enable row level security;

-- cada usuário só vê/gerencia a própria inscrição (o envio em si usa a service_role,
-- que ignora RLS, então o trainer consegue notificar o aluno sem precisar de acesso aqui)
drop policy if exists "push_subscriptions_select_self" on push_subscriptions;
create policy "push_subscriptions_select_self" on push_subscriptions for select
  using (profile_id = auth.uid());

drop policy if exists "push_subscriptions_insert_self" on push_subscriptions;
create policy "push_subscriptions_insert_self" on push_subscriptions for insert
  with check (profile_id = auth.uid());

drop policy if exists "push_subscriptions_delete_self" on push_subscriptions;
create policy "push_subscriptions_delete_self" on push_subscriptions for delete
  using (profile_id = auth.uid());
