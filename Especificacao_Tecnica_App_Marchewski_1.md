# Especificação Técnica — Marchewski App

> Documento reconstruído a partir do código-fonte em 21/08/2026. A versão
> original discutida numa conversa anterior ficou presa num computador
> remoto desconectado e nunca chegou a ser commitada — o `README.md` já
> referenciava este arquivo desde o commit inicial, mas ele nunca existiu no
> repositório. Este documento substitui essa referência.

## 1. Visão geral

PWA para o personal trainer Rafa Marchewski gerenciar alunos: treinos,
dietas, diário alimentar, avaliações físicas, agenda, financeiro e cobrança.
Dois papéis de usuário — **trainer** (o personal) e **student** (o aluno) —
compartilhando a mesma base de contas (`profiles.role`).

- **Produção:** https://app.marchewskiassessoria.com (o domínio raiz
  `marchewskiassessoria.com` hoje é uma landing page de marketing separada
  — "Back to Basics" — não este app)
- **Deploy:** Vercel, automático a cada push na branch `main`
- **Stack:** Next.js 16 (App Router, Server Components + Server Actions),
  TypeScript, Tailwind CSS, Supabase (Postgres + Auth + Storage), Stripe,
  Resend, Web Push (VAPID), Cloudflare Turnstile

## 2. Stack e infraestrutura

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS |
| Banco de dados | Supabase Postgres, com Row Level Security (RLS) como autoridade de acesso |
| Autenticação | Supabase Auth (`@supabase/ssr`) |
| Storage | Supabase Storage — 3 buckets privados: `avatars`, `evaluation-photos`, `exercise-videos` |
| Pagamentos | Stripe (checkout avulso e assinatura) |
| Email | Resend (único uso: boas-vindas no cadastro público) |
| Notificações | Web Push (VAPID), service worker próprio |
| Anti-bot | Cloudflare Turnstile + rate limit por IP (cadastro público) |
| Compressão de mídia | ffmpeg.wasm (vídeo) + canvas/`heic2any` (foto) no cliente |
| Cron | pg_cron + pg_net no Supabase, chamando rotas `/api/cron/*` |
| Deploy | Vercel, deploy automático a cada push em `main` |

## 3. Arquitetura de autorização (3 camadas)

1. **`proxy.ts`** (raiz do projeto — no Next.js 16 é o novo nome do antigo
   `middleware.ts`): garante que existe uma sessão válida. Mantém uma lista
   de rotas **públicas** (`/login`, `/cadastro`, `/redefinir-senha`, `/`,
   assets do PWA, `/api/webhooks/*`, `/api/cron/*`); qualquer rota fora
   dessa lista exige sessão, senão redireciona para `/login`. Também
   renova os cookies de sessão do Supabase a cada request. Abordagem
   deliberada de "lista de público" em vez de "lista de protegido", para
   uma tela nova nunca nascer desprotegida por esquecimento.
2. **Layouts dos route groups** (`app/(student)/layout.tsx` e
   `app/(trainer)/layout.tsx`): leem o `role` do perfil (via
   `getAuthProfile()`, memoizado por request) e redirecionam quem está na
   área errada (`trainer` tentando acessar área de `student` e
   vice-versa), e quem tem `must_change_password = true` para
   `/trocar-senha`. Existe mesmo com RLS correto, como segunda barreira —
   é hoje o único bloqueio contra um aluno logado digitando `/financas` na
   URL (RLS sozinho devolveria tela vazia, não redirecionamento).
3. **RLS no Postgres**: autoridade real de acesso a dados. Cada tabela tem
   policies baseadas em `auth.uid()` comparado a `trainer_id` (personal) ou
   `profile_id`/`student_id` (aluno, via subquery em `students`). Tabelas de
   biblioteca compartilhada (`exercises`, `foods`, `exercise_alternatives`)
   são de leitura livre para qualquer `authenticated`, escrita restrita a
   `role = 'trainer'`. Rotas server-side com `service_role` (cadastro
   público, upload de storage, cron) ignoram RLS por design.

## 4. Mapa de rotas

### Área do aluno — `app/(student)/`

| URL | Função |
|---|---|
| `/treino-do-dia` | Tela principal: ficha(s) ativa(s) do dia, exercícios em carrossel |
| `/treino-do-dia/concluido` | Pós-treino: resumo de carga, conquistas desbloqueadas, avaliação do treino |
| `/historico` | Calendário de treinos concluídos, streak, lista de sessões |
| `/nutricao` | Plano alimentar prescrito + diário alimentar livre do dia |
| `/progresso` | Gamificação (conquistas por streak/volume) + card de compartilhamento mensal |
| `/anamnese` | Formulário de anamnese digital preenchido pelo aluno |
| `/perfil` | Foto de perfil + troca de senha |

### Área do personal — `app/(trainer)/`

| URL | Função |
|---|---|
| `/dashboard` | Lista de alunos, alunos em risco, reavaliações pendentes, atividade recente |
| `/agenda`, `/agenda/nova`, `/agenda/[id]/editar` | Agenda semanal de aulas |
| `/agenda/lembretes/novo`, `/agenda/lembretes/[id]/editar` | Lembretes visuais na agenda (não vinculados a aula) |
| `/alunos/novo` | Cadastro de aluno pelo personal (gera credenciais + link público) |
| `/alunos/[id]` | Ficha completa: dados, pagamentos, evolução, calendário, feedback, volume |
| `/alunos/[id]/editar` | Editar cadastro / resetar senha |
| `/alunos/[id]/avaliacoes/novo`, `/…/[evalId]/editar` | Avaliação física (peso, medidas, fotos) |
| `/treinos/novo`, `/treinos/[id]/editar` | Criar/editar ficha de treino |
| `/treinos/[id]/evolucao` | Gráfico de evolução de carga por exercício |
| `/treinos/[id]/visualizar` | Visualização/impressão da ficha |
| `/modelos-treino` | Templates de treino reutilizáveis |
| `/exercicios` | Biblioteca de exercícios compartilhada |
| `/dietas`, `/dietas/novo`, `/dietas/[id]/editar` | Planos alimentares |
| `/dietas/[id]/recordatorio` | Comparativo prescrito × registrado pelo aluno |
| `/financas` | Dashboard financeiro (receita/despesa, pagamentos, gráfico 6 meses) |
| `/conta` | Troca de senha do personal |

### Autenticação (públicas/semi-públicas)

| URL | Função |
|---|---|
| `/` | Redireciona para `/login` |
| `/login` | Login + "manter conectado" + recuperação de senha |
| `/cadastro` | Autocadastro do aluno via link do personal (Turnstile + rate limit) |
| `/redefinir-senha` | Definir nova senha a partir do token de recuperação |
| `/trocar-senha` | Troca obrigatória de senha temporária no primeiro login |

### API (sem UI, autenticadas por segredo)

| Rota | Gatilho | Função |
|---|---|---|
| `POST /api/cron/reminders` | pg_cron a cada minuto | Push de lembrete de aula (aluno + personal), tolerância de 2h |
| `POST /api/cron/birthdays` | pg_cron 1x/dia (12:00 UTC) | Push de aniversário (aviso ao personal, parabéns ao aluno) |
| `POST /api/webhooks/stripe` | Stripe | Processa `checkout.session.completed` e eventos de assinatura |

Crons protegidos por `Authorization: Bearer <CRON_SECRET>`; webhook Stripe
valida assinatura `stripe-signature` com `STRIPE_WEBHOOK_SECRET`.

## 5. Modelo de dados

Fonte: `supabase/schema.sql` + ~30 arquivos `supabase/migration-*.sql`.

### Contas e alunos
- **`profiles`** — conta (trainer ou student), `role`, `must_change_password`,
  `avatar_url` (path privado no bucket `avatars`).
- **`students`** — cadastro do aluno: `trainer_id`, `profile_id`, `phone`,
  `birth_date`, `goal`, `status`, `service_type` (`assessoria`/`personal`),
  `level`, `anamnesis jsonb`, `sex`, `activity_level`, `stripe_customer_id`,
  `subscription_status`.

### Treinos
- **`exercises`** — biblioteca compartilhada (`active`, `joint_type`).
- **`exercise_alternatives`** — mapeamento N:N exercício → alternativa.
- **`workouts`** — ficha de treino (`student_id`, `status`,
  `planned_sessions`, `display_order`). **Sem coluna `created_at`.**
- **`workout_labels`** — nome/dia fixo por bloco (Treino A/B/C) dentro de
  uma ficha.
- **`workout_exercises`** — exercícios da ficha (`label`, `sets`, `reps`,
  `load`, `rest_seconds`, `method`, `order_index`).
- **`workout_logs`** — execução por exercício: `completed`,
  `difficulty_rating`, `actual_load`, `actual_loads`/`actual_reps` (jsonb,
  série a série), `substituted_exercise_id`, vídeo de feedback
  (`video_path`, bucket `exercise-videos`) + resposta do personal.
- **`workout_templates`** / **`workout_template_exercises`** — modelos
  reutilizáveis (só o trainer acessa).
- **`workout_sessions`** — registro agregado de treino concluído por
  dia/bloco, com `rating` (1-5).

### Dietas e diário alimentar
- **`diet_plans`** — plano por aluno, metas diárias opcionais
  (`daily_calories/protein/carbs/fat`).
- **`diet_meals`** — refeições do plano.
- **`diet_meal_foods`** — alimentos **prescritos** por refeição (`food_id`,
  `quantity_g`) — é o "plano".
- **`diet_logs`** — marcação diária de refeição prescrita feita/não feita.
- **`diet_log_foods`** — alimentos **realmente registrados** numa refeição
  prescrita — é o "realizado". `diet_meal_foods` e `diet_log_foods` nunca
  devem ser confundidas.
- **`diet_diary_entries`** / **`diet_diary_entry_foods`** — diário alimentar
  livre, sem vínculo com o plano.
- **`water_logs`** — registro de ingestão de água.

### Avaliações
- **`evaluations`** — `weight`, `body_fat`, `measurements jsonb`, `height`,
  `photos text[]` (bucket `evaluation-photos`), `next_assessment_date`.
- Anamnese não é tabela própria: é `students.anamnesis jsonb`.

### Financeiro
- **`finance_entries`** — receita/despesa, `amount_cents`, `business`
  (`assessoria`/`personal`), `student_id` opcional.
- **`finance_settings`** — meta mensal por negócio
  (`assessoria_goal_cents`/`personal_goal_cents`).

### Agenda
- **`training_sessions`** — aulas com horário, `reminder_minutes_before`,
  `reminder_sent`, `recurrence_group_id`, `status`.
- **`agenda_reminders`** — aviso visual num período (não é aula).
- Lembrete de aniversário usa `students.birth_date` já existente.

### Notificações e pagamentos
- **`push_subscriptions`** — inscrição Web Push por perfil.
- **`payments`** — `type` (`subscription`/`one_time`), `amount_cents`,
  `stripe_checkout_session_id`, `status`.

### Cadastro público e segurança
- **`signup_attempts`** — controle de rate limit (`ip_hash`, nunca o IP
  cru). RLS sem nenhuma policy — só `service_role` acessa.
- `profiles.must_change_password` — força troca de senha temporária no
  primeiro login (cadastro pelo trainer ou autocadastro público).

### Tabelas de referência
- **`foods`** — base nutricional (`taco_id`, macros por 100g,
  `unit_weight_g`). `taco_id` real vai até 597; itens adicionados pelo app
  usam faixa 90001+. Populada por TACO + POF/IBGE + Open Food Facts + itens
  industrializados.
- **`exercises`** — biblioteca de exercícios, populada por seeds próprios.

### Storage (buckets privados, `public: false`)
`avatars`, `evaluation-photos`, `exercise-videos` — acesso sempre via
`service_role` no servidor, sem policy de storage necessária.

## 6. Integrações externas

- **Stripe** (`lib/stripe.ts`): checkout avulso (Pix + cartão) ou assinatura
  mensal, criado pelo personal em `alunos/[id]/pagamentos`. Webhook
  sincroniza `payments.status` e `students.subscription_status`.
- **Resend** (`lib/email.ts`): único email — boas-vindas no autocadastro,
  com link de login e senha temporária. Best-effort: falha não bloqueia o
  cadastro.
- **Web Push** (`lib/webpush.ts`, `lib/sendPush.ts`): VAPID, dispara em 4
  eventos — lembrete de aula, aniversário, treino concluído (avisa
  personal), novo treino criado (avisa aluno). Inscrição morta (404/410) é
  removida automaticamente.
- **Cloudflare Turnstile** (`lib/turnstile.ts`): captcha invisível no
  autocadastro. Fail-open se a chave secreta não estiver configurada ou a
  chamada à Cloudflare falhar — rate limit por IP é a segunda barreira.
- **Rate limit** (`lib/rateLimit.ts`): 5 tentativas de cadastro por IP a
  cada 60 min, hash SHA-256 do IP. Fail-open se a query falhar.
- **ffmpeg.wasm** (`lib/videoCompression.ts`): compressão de vídeo de
  feedback de exercício no navegador, até 2 passes (720p→480p), alvo 45MB.
- **Compressão de imagem** (`lib/image.ts`): redimensiona a 1440px,
  qualidade 0.75, converte HEIC/HEIF (iPhone) para JPEG via `heic2any`.

## 7. Segurança

- Headers aplicados a todas as rotas (`next.config.mjs`):
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS
  (`preload`), `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` restringindo câmera/microfone ao próprio app e
  bloqueando geolocalização.
- Senha mínima de 8 caracteres (`lib/passwordPolicy.ts`), imposta de fato
  pelo Supabase Auth.
- Senha temporária de 8 caracteres (`lib/password.ts`) para contas novas,
  com troca obrigatória no primeiro login.
- Server Actions com limite de body de 8MB (fotos já comprimidas no
  cliente antes do envio).
- IP nunca armazenado em texto puro (sempre hash SHA-256) em
  `signup_attempts`.

## 8. PWA

- **`public/manifest.json`**: `start_url: /login`, `display: standalone`,
  cores navy (`#1F2556`), ícones 192/512.
- **`public/sw.js`** (cache `marchewski-shell-v3`): cache do app shell,
  network-first com fallback ao cache para GET de mesma origem (nunca
  intercepta chamadas ao Supabase), `skipWaiting`+`clients.claim`, mais
  handlers de `push`/`notificationclick`.
- **`components/RegisterSW.tsx`**: registra o SW e recarrega a página uma
  vez quando uma nova versão assume controle após deploy.
- **`components/InstallPrompt.tsx`**: banner de instalação — instrução
  manual no iOS, `beforeinstallprompt` no Android/desktop, escondido por 14
  dias após dispensa.

## 9. Variáveis de ambiente

Obrigatórias (`lib/env.ts::requiredEnv`):
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`.

Opcionais (fallback gracioso):
`RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.

## 10. Convenções de domínio

- **Macros sempre por caloria, nunca por grama** (proteína/carbo ~4kcal/g,
  gordura ~9kcal/g) — todo componente de proporção calcula pela
  contribuição calórica.
- **Carboidrato em `foods` é sempre TOTAL** (inclui fibra), convenção
  TACO/USDA — ao cadastrar item de rótulo brasileiro (ANVISA, que declara
  sem fibra), somar a fibra antes de inserir.
- **`diet_meal_foods` (prescrito) × `diet_log_foods` (realizado)** — nunca
  confundir; a tela do aluno mostra as duas lado a lado.
- **`workouts` pode ter múltiplos `label`s** (blocos A/B/C no mesmo
  registro de ficha); UI desambigua por contagem de nomes repetidos.
- **Paleta de marca**: `navy` (fundo/texto forte), `orange` (CTA), `blue`
  (degradê de header), `lightblue`, `peach`. Tom de design: polimento, não
  redesign.

## 11. Deploy

- Push em `main` → build e deploy automático na Vercel.
- Sempre verificar em produção após deploy (propagação da Vercel não é
  instantânea).
- Migrações SQL em `supabase/migration-*.sql` são aplicadas manualmente no
  SQL Editor do Supabase (não há runner de migração automatizado no
  projeto).

## 12. Pontos em aberto

Este documento cobre o estado atual do código. Decisões de produto,
roadmap e prioridades futuras não estão registradas em lugar nenhum do
repositório — ficaram apenas na conversa perdida. Se o Rafa lembrar de
alguma decisão específica que valha registrar aqui (ex.: por que
`service_type` existe, próximos passos do financeiro, etc.), vale
complementar este arquivo.
