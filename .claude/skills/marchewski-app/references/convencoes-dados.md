# Convenções de domínio e dados

## Base de alimentos (`foods`)
- `taco_id` real (fonte TACO) vai até **597**. Alimentos adicionados pelo
  app (não estão na TACO) usam faixa **90001+**, incrementando.
- **Sempre confirme o maior `taco_id` atual com uma query antes de inserir**
  (`order("taco_id", { ascending: false }).limit(1)`) — não confie num
  número "de cabeça" de uma sessão anterior, ele muda a cada lote inserido.
  Em 15/08/2026 o valor era 90205, com 800 alimentos no total — só como
  referência de ordem de grandeza, **não** como valor atual.
- Insert idempotente: `insert ... on conflict (taco_id) do nothing`.
- **Carboidrato é sempre TOTAL (incluindo fibra)** nesta tabela, que é a
  convenção da TACO e do USDA — e 596 dos ~800 alimentos vêm da TACO. Rótulo
  brasileiro (ANVISA) declara carboidrato **sem** a fibra, então ao cadastrar
  item de marca **some a fibra ao carboidrato do rótulo** antes de inserir
  (ex.: Nestlé aveia flocos finos, rótulo 53,3 C + 11,3 fibra → grave 64,6).
  Sem isso a soma diária do plano mistura duas réguas diferentes.
  Confira reconstruindo a energia: `P×4 + C_disponível×4 + fibra×2 + G×9`
  tem que chegar perto do kcal do rótulo.
- Categoria usada pros itens fora da TACO: "Preparados/Suplementos" (ou uma
  categoria nova coerente, tipo "Industrializados", quando fizer sentido
  separar).
- Ao pesquisar valor nutricional novo, cruzar com **pelo menos 2 fontes**
  antes de inserir.

### Onde buscar valor nutricional (fontes já usadas e testadas)
- **USDA FoodData Central** — melhor fonte primária: domínio público (obra do
  governo dos EUA), sem restrição de uso comercial, que é o caso deste app.
  A API oficial (`api.nal.usda.gov/fdc/v1`) com `DEMO_KEY` estoura o limite
  em ~7 chamadas. Use o endpoint do próprio portal, que **não pede chave**:
  `POST https://fdc.nal.usda.gov/portal-data/external/search` com body
  `{includeDataTypes:{"SR Legacy":true,Foundation:true}, generalSearchInput:"<termo>",
  pageNumber:1, pageSize:25, numberOfResultsPerPage:25, requireAllWords:true,
  startDate:"", endDate:""}`. A resposta já traz `foodNutrients` completo —
  ids que interessam: 1008 kcal, 1003 proteína, 1004 gordura, 1005 carboidrato
  (por diferença, inclui fibra, mesmo critério da TACO), 1079 fibra, 1093 sódio.
  Dá pra rodar direto do Node (fetch global), sem browser.
- **TBCA (USP/FoRC, tbca.net.br)** — boa como *segunda* fonte e para item
  brasileiro sem equivalente americano (queijo coalho, pratos típicos). É
  CC BY-NC-ND, ou seja **não** serve como base para importação em massa num
  app comercial — consulte item a item para conferência e cite a fonte.
  Busca é POST em `composicao_alimentos.php` (campos `guarda`, `produto`,
  `cmb_grupo`, `cmb_tipo_alimento`); os links do resultado têm o id
  criptografado, então precisa raspar o href da linha e seguir. Na página do
  alimento, usar a linha "Energia/kcal" e "Carboidrato total" (o
  "Carboidrato disponível" exclui fibra e **não** é o critério da tabela).

### Armadilhas ao ampliar a base (aprendidas na sessão de 15/08/2026)
- **Prato cozido/hidratado diverge entre fontes por causa da água, não do
  dado.** Farelo de aveia cozido: USDA 40 kcal/100g × TBCA 94 kcal/100g. Se
  as duas fontes discordarem >30% num item "cozido/preparado", **não insira** —
  prescreva o item cru/seco, que é como o personal pesa mesmo.
- **Conferência de macro por Atwater (P×4 + C×4 + G×9) acusa falso positivo**
  em alimento com muita fibra (cacau em pó, canela, farelo), em bebida
  alcoólica (álcool tem 7 kcal/g e não está em P/C/G) e em alimento de
  pouquíssima caloria (arredondamento). Serve pra achar erro de digitação
  grosseiro, não pra validar o dado.
- **Antes de inserir, cheque duplicata pelo substantivo-cabeça** (o termo antes
  da primeira vírgula), não pelo nome inteiro — "Amêndoa, crua" × "Amêndoa,
  torrada, salgada" são itens diferentes, mas "Chocolate, amargo" colidia de
  fato com o "Chocolate, meio amargo" que já existia.
- Item de faixa larga demais não entra: o "dark chocolate" do USDA é média de
  45% a 85% de cacau, inútil pra prescrever.
- **Open Food Facts é colaborativo e tem erro de digitação.** O "Pão de forma,
  sanduíche, Marilan" entrou com 390 kcal/100g copiado de lá; os macros do
  próprio registro davam 263, e todo pão de forma branco fica entre 244 e 276.
  Antes de cadastrar qualquer coisa vinda do OFF, **reconstrua a energia pelos
  macros** e compare com itens irmãos da mesma categoria. Erro de ~50% passa
  despercebido se ninguém olhar.
- O OFF cai com frequência (503 no `cgi/search.pl` e nos endpoints de facet).
  O que funciona melhor: `api/v2/search?brands_tags=<marca>`. O parâmetro `q`
  do v2 é **ignorado** — pedir `q=aveia` devolve a base inteira, sem filtrar;
  use `brands_tags`/`categories_tags`, ou o `cgi/search.pl` quando estiver no ar.
- **Nome regional esconde duplicata.** "Curimatã" (POF) = "Corimba" (TACO);
  "surubim" = "pintado"; "meluza" = "merluza". Antes de inserir peixe ou corte
  de carne com nome popular, procure os sinônimos, não só o nome literal.

### Auditar a base contra o consumo real do Brasil (POF/IBGE)
Não existe ranking público de "mais vendidos" por categoria — é dado
proprietário (Nielsen, Kantar). O substituto oficial é a **POF** (Pesquisa de
Orçamentos Familiares), que mede aquisição domiciliar per capita em kg/ano por
produto. Puxa direto pela API, sem chave:

```
https://apisidra.ibge.gov.br/values/t/2393/n1/1/v/1207/p/2018/c217/all
```

O campo `D4N` vem com a numeração hierárquica ("1.1.2 Arroz polido"): 1 nível
= grupo, 2 = subgrupo, 3 = produto. Atenção: o nome do grupo tem ponto final
("1. Cereais e leguminosas"), então tire o ponto antes de contar o nível.

São 329 linhas, das quais **75 são resíduo estatístico** ("Outros", "não
especificado") e não são alimento prescritível — filtre. Sobram 254 produtos
reais. Em 15/08/2026, 244 deles já estavam na base (96,1%); os 10 restantes
não têm composição publicada nem na TBCA nem no USDA (massa de pizza e peixes
regionais amazônicos), e foram deliberadamente deixados de fora.

## Macros: sempre por caloria, nunca por grama
Proteína e carboidrato têm ~4 kcal/g, gordura tem ~9 kcal/g — comparar
"gramas de gordura" com "gramas de carboidrato" lado a lado é enganoso.
Todo componente que mostra "proporção" de macro (`MacroPieChart`,
`MacroPieLegend` em `components/MacroPieChart.tsx`) calcula o percentual
**pela contribuição calórica** de cada macro, não pelo grama bruto.
`MACRO_COLORS`: proteína `#2F4599` (azul/navy), carboidrato `#ED5B35`
(laranja), gordura `#F3A888` (pêssego).

## `diet_meal_foods` × `diet_log_foods`
- `diet_meal_foods`: o que o **personal prescreveu** pra aquela refeição
  (alimento + quantidade em gramas). É o "plano".
- `diet_log_foods`: o que o **aluno realmente registrou** ter comido. É o
  "realizado".
São tabelas separadas de propósito — nunca confundir "aparecer no
diário" com "aparecer como prescrito"; a tela do aluno em `nutricao/page.tsx`
busca as duas e mostra lado a lado pra comparação.

## Estrutura de treino
- `workouts`: 1 row por ficha (`status: "active" | ...`). **Sem coluna
  `created_at`.**
- `workout_exercises`: várias rows por `workouts.id`, cada uma com
  `label` (string livre, tipicamente "A"/"B"/"C"/"D", mas pode repetir
  entre workouts diferentes) e `order_index`.
- Um `workout` pode ter **múltiplos `label`s** (ex. "Bloco A" e "Bloco B" no
  mesmo registro de ficha) — é o jeito do app representar uma ficha dividida
  em mais de um treino no mesmo dia. A UI precisa disambiguar isso quando o
  **nome da ficha se repete** entre sessions — padrão usado em
  `FichaCarousel.tsx` (`nameCounts`): conta quantas sessions compartilham
  `workoutName`; se >1, mostra "Bloco {label}" como subtítulo. Quando os
  nomes já são únicos (convenção "Treino A/B/C/D"), não mostra nada extra.

## Paleta de marca (Tailwind, `tailwind.config.ts`)
`navy` (fundo escuro principal / texto forte), `orange` (destaque/CTA),
`blue` (degradê com navy nos headers), `lightblue` (fundos suaves,
`bg-lightblue/10`), `peach` (avatares/decoração, também cor de "gordura" nos
gráficos de macro). Cabeçalhos usam gradiente
`bg-gradient-to-br from-navy via-navy to-blue` com blobs decorativos
(`blur-3xl`) num wrapper `overflow-hidden` **separado** do header (ver bug #5
em `debug-padroes.md`).

## Tom de design
Polimento, não redesign: manter navy/laranja, melhorar espaçamento, sombra,
tipografia e estados de hover — é a diretriz que o Rafa já confirmou pra
qualquer trabalho visual neste app (ver também a memória
`[[marchewski-tom-de-voz]]` pro tom de **texto**, que é um princípio
relacionado mas separado — aqui é sobre UI/CSS).
