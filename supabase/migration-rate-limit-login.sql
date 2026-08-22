-- Rate limit de login e recuperação de senha.
--
-- signInWithPassword e resetPasswordForEmail são chamados direto do
-- navegador pro Supabase Auth (SDK client) — por isso o limite roda ANTES
-- dessa chamada, numa Server Action própria (ver lib/rateLimit.ts). Isso
-- levanta a régua pra quem passa pela nossa UI (o caso comum de robô/script
-- batendo no formulário). Importante: como a anon key é pública, alguém
-- pode bater direto na API do Supabase Auth e pular esse limite — a
-- barreira definitiva pra esse caso é o rate limit do próprio projeto
-- Supabase (Authentication > Rate Limits) e, se quiser reforçar mais,
-- CAPTCHA a nível de Auth. Isso aqui é defesa em camadas, não substituto.
--
-- Guardamos só o HASH do IP (sha256), nunca o IP em si, igual ao rate
-- limit do cadastro (migration-rate-limit-cadastro.sql).
--
-- `kind` distingue login (só conta tentativa ERRADA — login certo nunca
-- consome cota) de password_reset (conta toda tentativa, já que a resposta
-- pro usuário é sempre a mesma mensagem, exista ou não o e-mail).
--
-- Rode no SQL Editor do Supabase.

create table if not exists auth_attempts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('login', 'password_reset')),
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists auth_attempts_kind_ip_time_idx
  on auth_attempts (kind, ip_hash, created_at desc);

-- Ninguém acessa essa tabela pelo app: quem escreve/lê é a service_role
-- (que ignora RLS) dentro das próprias actions de login/recuperação. Com
-- RLS ligada e nenhuma policy, qualquer acesso via anon key é negado por
-- padrão.
alter table auth_attempts enable row level security;

NOTIFY pgrst, 'reload schema';
