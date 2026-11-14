-- Mural: indicador de recado não lido na navegação do aluno.
-- O conteúdo do mural já chega pro aluno independente de notificação (a
-- RLS do mural_posts não depende disso) — o que faltava era um jeito de
-- ele NÃO escapar do recado mesmo sem o push: uma marca de "última vez
-- que abriu o mural" pra comparar com os posts e mostrar uma bolinha na
-- navegação quando tem recado novo.
--
-- Rode no SQL Editor do Supabase.

alter table profiles add column if not exists mural_last_seen_at timestamptz;

NOTIFY pgrst, 'reload schema';
