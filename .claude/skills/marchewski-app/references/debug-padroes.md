# Padrões de bug que já apareceram neste app

Catálogo de causas-raiz já confirmadas — antes de sair chutando `z-index`
maior ou `!important`, checa se o problema bate com um destes.

## 1. `overflow-x: auto` corta conteúdo que "vaza" pra cima/baixo
Regra do CSS: um elemento não pode ter um eixo `visible` e o outro não — se
você declara `overflow-x: auto` (ex. num carrossel com scroll horizontal), o
navegador força o eixo Y a virar `auto` também, mesmo sem você pedir. Qualquer
filho que dependa de estourar o container por cima/baixo (badge com
`-top-2`, sombra decorativa, etc.) fica cortado.

**Sintoma:** um selo/badge com posição negativa aparece cortado só quando o
container pai tem scroll horizontal.
**Fix:** dar padding suficiente no lado que teria vazado (ex. `pt-3` em vez de
`pt-1`) pra reservar o espaço dentro da área "visível" do scroll, em vez de
tentar deixar vazar.
**Caso real:** selo "Hoje" cortado no seletor de fichas
(`components/student/FichaCarousel.tsx`).

## 2. `space-y-*` do Tailwind aplica margin em elementos `fixed`
`space-y-N` usa um seletor tipo `:where(& > :not(:last-child))` com
especificidade baixíssima, e ele aplica `margin-top` em **todo** filho direto
do flow — inclusive um filho com `position: fixed`. Margin ainda vale pra
elemento posicionado sem margin `auto`, então um modal fullscreen dentro de
uma árvore com `space-y-4` num ancestral pode aparecer deslocado, não
cobrindo a tela inteira.
**Fix definitivo:** renderizar o modal via `createPortal(..., document.body)`
(de `react-dom`) — sai da árvore de layout do ancestral, não herda `margin`,
`overflow` nem `transform` de ninguém.
**Caso real:** `components/RestTimer.tsx`, modal de tela cheia do cronômetro.

## 3. JSX: `{condição && (...)}` só aceita UM filho raiz
Colocar um `{/* comentário */}` como irmão logo antes de um elemento dentro
desse tipo de bloco quebra a sintaxe (`TS1005: ')' expected` e erros em
cascata), porque o parser trata o comentário como uma segunda expressão
dentro do mesmo `{...}`.
**Fix:** comentário explicativo vai **fora** da expressão, como comentário JS
normal na linha de cima (`// ...` ou `/* ... */` antes do `{condição && (`),
nunca como o primeiro nó dentro dela.

## 4. Elemento `fixed` novo colidindo com o cabeçalho
O cabeçalho do aluno (`app/(student)/layout.tsx`) e do personal
(`app/(trainer)/layout.tsx`) tem sempre: logo à esquerda
(`aria-label="Voltar para o início"`) + menu de conta/engrenagem à direita
(`aria-label="Configurações da conta"`), num `flex justify-between` dentro de
`px-6 pt-4`. Qualquer botão `fixed` novo no topo (como o `WhatsAppButton`)
precisa ficar num vão livre entre os dois, ou vai sobrepor um ou outro —
**e o vão muda de tamanho** entre desktop e mobile (375px), então teste nos
dois.
**Como checar rápido:** pegue os três elementos por `aria-label`/seletor,
tire `getBoundingClientRect()` de cada um, e teste sobreposição com a função
`overlap()` de `deploy-verificar.md`. Não confie só no olho.
**Caso real:** botão do WhatsApp — já passou por 3 posições (canto inferior
direito → sobrepondo controles de treino embaixo; canto superior esquerdo →
sobrepondo a logo; centralizado → funcionava mas o Rafa preferiu perto da
engrenagem; posição final: canto superior direito, com `right-[4.5rem]`,
deixando ~12px de vão até a engrenagem).

## 5. `overflow-hidden` decorativo cortando um menu que "vaza" via `position:absolute`
Se o cabeçalho tem um glow/decoração de fundo com `overflow-hidden` no
elemento pai, e um menu dropdown (`position: absolute`, ex. o menu da
engrenagem) mora dentro desse mesmo pai, o dropdown fica cortado quando abre
pra fora dos limites do cabeçalho.
**Fix:** `overflow-hidden` só na camada decorativa (uma `<div>` interna,
`aria-hidden`, só com os blobs de glow), nunca no `<header>` inteiro.

## Método geral de diagnóstico usado aqui
1. Reproduzir com dados reais via query direta (service-role) antes de supor
   a causa — ex. o bug de "cards duplicados" na FichaCarousel só foi
   confirmado depois de consultar `workout_exercises` do aluno real e ver
   os blocos A/B de fato existindo (20 exercícios, 10/10).
2. Preferir inspeção de DOM (`getBoundingClientRect`, `getComputedStyle`) a
   screenshot quando o Browser pane estiver instável.
3. Se for testar um bug em conta real, considerar criar um dado de teste
   temporário (numa conta QA, nunca na conta do aluno real), confirmar o
   fix, e **apagar o dado de teste depois** (linha própria de limpeza no
   script, não deixar lixo em nenhuma conta).

## 7. "Tudo minúsculo" no celular do Rafa = "Site para computador" do Chrome
Sintoma: print do celular com a tela inteira encolhida — cartão de login
pequeno no meio, lista de alunos em DUAS colunas, menu inteiro numa linha.
Isso significa viewport de layout de ~980px, não ~412px. Como diagnosticar
pelo print: se um grid `md:grid-cols-2` aparece em duas colunas num celular,
o viewport é ≥768px e o caso é este.

Causa: o toggle **"Site para computador"** do Chrome Android, que fica salvo
**por domínio** — foi o que aconteceu na troca do app da raiz pro subdomínio
`app.` (ago/2026). Não é bug de CSS: nesse modo o navegador ignora a meta
viewport de propósito, e NENHUM código conserta (nem `user-scalable=no`,
nem `touch-action`). Prova definitiva na época: o mesmo build aberto pelo
link `*.vercel.app` (outro domínio, sem o toggle salvo) renderizava normal.

Conserto (no aparelho, não no código): abrir o domínio numa aba do Chrome →
menu ⋮ → desmarcar "Site para computador"; se a caixa já estiver desmarcada,
remover a exceção em Configurações → Configurações do site → Site para
computador. Depois fechar o PWA de vez e reabrir.

Corolário: antes de "corrigir" uma tela que parece pequena num print do
Rafa, medir o viewport implícito (largura de um elemento conhecido ÷ fração
que ele ocupa no print). Se der ~980px, é isto — não mexer no layout.

## 8. Consulta PostgREST sem `limit` em tabela que cresce = corte mudo em 1000
O PostgREST devolve no máximo 1000 linhas por padrão, SEM ordem definida
e SEM erro — a consulta "funciona" e o código processa um subconjunto
aleatório. Flagrado nos lembretes de aula (24/08/2026): a rota do cron
buscava toda aula futura sem lembrete; com a agenda recorrente criada
semanas à frente (>1000 aulas), a aula DO DIA ficava fora do pacote e o
lembrete nunca saía — manhãs funcionavam por sorte de posição no heap,
e atualizações mexiam na ordem, fazendo o raro lembrete atrasado (13h
chegou 14h38). Sintoma típico: comportamento intermitente/por horário
sem nenhum erro em lugar nenhum.

Regra: toda consulta em tabela que acumula registros (aulas, logs,
posts) leva `order` + `limit` explícitos e um recorte de janela
(`gte/lte`) do período que realmente importa.

## 9. Lembrete de aula atrasado "em rajada" = carteiro do pg_net
Depois do fix do padrão 8, sobrou um segundo atraso: o robô (pg_cron)
dispara certo a cada minuto, mas o **worker do pg_net** que executa as
chamadas HTTP trava por períodos e despacha a fila em rajada — lembrete
das 4h30 chegando 5h49, das 7h30 chegando 8h21, com `cron.job_run_details`
100% "succeeded" (o succeeded é só do enfileirar, a chamada é assíncrona).
Mitigações já aplicadas: `timeout_milliseconds := 15000` + push com
`urgency: "high"` e `TTL: 3600` (lembrete que não chegou em 1h é
descartado, nunca chega depois da aula). **Plano aprovado e PENDENTE**:
Rafa criar conta no cron-job.org (POST a cada 1min em
`/api/cron/reminders` com o header Authorization Bearer do CRON_SECRET) e
aí desligar o job `send-session-reminders` do pg_cron pra não duplicar.

## 10. "Manter conectado não funciona" = porta de entrada cega (resolvido)
O PWA abre sempre no `/login` (start_url do manifest) e a raiz também
manda pra lá — e nada conferia a sessão: o formulário aparecia pra todo
mundo, logado ou não. Sintoma: "fechei o app e pediu login de novo", com
a sessão viva o tempo todo. Fix no proxy (ago/2026): logado em `/login` →
redirect `/dashboard` (aluno é devolvido pro `/treino-do-dia` pela
barreira de papel). Se voltar a acontecer, o suspeito seguinte é app
"limpador" apagando dados do site no aparelho.
