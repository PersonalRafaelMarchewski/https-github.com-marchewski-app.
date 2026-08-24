---
name: marchewski-app
description: >
  Runbook de trabalho para o Marchewski App (Next.js App Router + TypeScript +
  Tailwind + Supabase, PWA de personal trainer, deploy em
  https://app.marchewskiassessoria.com via Vercel). Use sempre que for mexer neste
  projeto: deployar, verificar uma correção em produção, debugar um bug visual
  (CSS/overflow/z-index/sobreposição), criar dados de teste (aluno, treino,
  dieta) ou mexer na base de alimentos. Reúne os padrões e as armadilhas já
  descobertas nas sessões anteriores pra não redescobrir do zero.
---

# Marchewski App — runbook de trabalho

PWA para o Rafa Marchewski (personal trainer, `criptodailycaps@gmail.com`)
gerenciar alunos: treinos, dietas, diário alimentar, avaliações. Stack:
Next.js App Router (Server Components + Server Actions), TypeScript, Tailwind,
Supabase (Postgres + Auth + RLS). Produção: **https://app.marchewskiassessoria.com**
(deploy automático da Vercel a cada push na `main`).

**Atenção ao domínio:** o app vive no subdomínio `app.`. O domínio raiz
`marchewskiassessoria.com` é outra coisa — a landing de marketing "Back to
Basics", um site separado. Lá `/login` devolve 404. Verificar o deploy no
domínio errado já quase fez uma sessão concluir que um fix bom tinha falhado.

## Regra de ouro: deploy sem perguntar
O Rafa já autorizou `git push` direto pra `main` sem pedir confirmação — é o
fluxo padrão aqui, não uma exceção. Depois de deployar, **sempre verifique em
produção antes de dizer que terminou** — ver `references/deploy-verificar.md`
pro passo a passo (propagação da Vercel não é instantânea, e o Browser pane
frequentemente não alcança um dev server local nesta máquina).

## Antes de escrever qualquer CSS/posicionamento de elemento fixo
Este app tem uma armadilha recorrente: cabeçalho com logo (esquerda) +
engrenagem de conta (direita) + qualquer botão flutuante novo — todo elemento
`fixed` novo precisa ser checado contra os dois em desktop **e** em 375px
(mobile) antes de dar por certo. Ver `references/debug-padroes.md` pro
checklist e pros bugs de CSS/React que já apareceram (overflow-x cortando
overflow-y, `space-y-*` vazando margin pra elementos `fixed`, JSX de filho
único em condicional).

## Criar dados de teste (aluno, treino, dieta)
Nunca insira teste em conta de aluno real. Use o padrão de script temporário
`_nome.mjs` na raiz (já no `.gitignore`, roda com `node _nome.mjs`) com o
service-role do Supabase. Ver `references/seed-dados-teste.md` pro template
completo e pros valores de referência (fórmula de meta calórica, estrutura de
treino, IDs de alimentos já usados).

## Convenções de dados e domínio
`taco_id`, cálculo de macro por caloria (não por grama), estrutura
`workout_exercises`/`diet_meal_foods` vs `diet_log_foods`, paleta de marca —
ver `references/convencoes-dados.md`.

## Quando o feedback do Rafa vier ambíguo
Ele manda prints com seta/círculo desenhado à mão, ou frases curtas tipo "não
tá bom" / "muda isso aí". Antes de supor uma posição/elemento exato e já sair
commitando, prefira uma `AskUserQuestion` com 2-3 interpretações concretas —
errar a suposição numa correção de UI custa um ciclo inteiro de
deploy-esperar-verificar. Só siga direto sem perguntar quando o pedido aponta
um elemento e uma ação inequívocos.

## Tarefas e horário
Sempre que o pedido envolver anotar/criar uma tarefa (não necessariamente
código), escreva em português e inclua o horário — já é convenção nas suas
memórias gerais, vale também aqui dentro do projeto.
