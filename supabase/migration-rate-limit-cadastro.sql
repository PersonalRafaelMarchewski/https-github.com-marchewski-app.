-- Rate limit do cadastro público.
--
-- O /cadastro é um link fixo que cria conta de verdade (auth + profile +
-- student) usando a service_role. Sem limite, um robô com o link cria
-- alunos em massa: polui a base, consome cota de e-mail e enche a lista do
-- personal de lixo.
--
-- Guardamos só o HASH do IP (sha256), nunca o IP em si — serve igual pra
-- contar tentativas e evita guardar dado pessoal à toa.
--
-- Rode no SQL Editor do Supabase.

create table if not exists signup_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists signup_attempts_ip_time_idx
  on signup_attempts (ip_hash, created_at desc);

-- Ninguém acessa essa tabela pelo app: quem escreve/lê é a service_role
-- (que ignora RLS) dentro da própria action de cadastro. Com RLS ligada e
-- nenhuma policy, qualquer acesso via anon key é negado por padrão.
alter table signup_attempts enable row level security;

NOTIFY pgrst, 'reload schema';
