# Marchewski App

PWA para assessoria esportiva — painel do personal + app do aluno.

## Setup

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie `.env.local.example` para `.env.local` e preencha com a URL e a
   anon key do seu projeto Supabase (Settings → API).
3. Rode o schema em `supabase/schema.sql` no SQL Editor do Supabase (cria
   as tabelas e as policies de RLS).
4. Crie o primeiro usuário `trainer`:
   - Crie o usuário em Authentication → Users no painel do Supabase.
   - Insira a linha correspondente em `profiles` com `role = 'trainer'`.
5. Coloque os assets de marca em `public/`:
   - `logo-positivo.png`, `logo-negativo.png`
   - `icon-192.png` (192x192) e `icon-512.png` (512x512)
6. Rode o projeto:
   ```bash
   npm run dev
   ```

## Estrutura

Ver `Especificacao_Tecnica_App_Marchewski_1.md` para o detalhamento completo
de telas, modelo de dados e roadmap.
