-- Fotos nas avaliações físicas. Rode no SQL Editor do Supabase.

alter table evaluations add column if not exists photos text[];

-- Bucket privado — todo acesso (upload e leitura) passa pelo servidor
-- usando a service_role key, então não precisa de policies de storage aqui.
insert into storage.buckets (id, name, public)
values ('evaluation-photos', 'evaluation-photos', false)
on conflict (id) do nothing;
