-- Adiciona altura na avaliação física. Rode no SQL Editor do Supabase.
-- As circunferências novas e as dobras cutâneas não precisam de
-- migração — já usam o campo "measurements" (jsonb) que já existe.

alter table evaluations add column if not exists height numeric;
