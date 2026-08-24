-- Auditoria do sódio dos itens vindos do Open Food Facts (seeds
-- seed-open-food-facts-marcas.sql e -2.sql) — 24/08/2026.
--
-- MOTIVO: ao cadastrar o Pão de Milho da Panco a partir do rótulo real,
-- apareceu uma divergência de 2,5× contra o registro do Open Food Facts do
-- mesmo produto (OFF: 123 mg de sódio; rótulo: 307 mg). Isso levantou a
-- suspeita de erro de unidade nos itens de marca já cadastrados. A auditoria
-- abaixo checou os 80 itens.
--
-- CONTEXTO DE IMPACTO, pra dimensionar: `sodium_per_100g` hoje não é lido em
-- lugar nenhum do app — nenhuma referência em .ts/.tsx, nenhuma tela e nenhum
-- cálculo de macro usam o campo. Nada do que está errado aqui chegou a
-- afetar uma dieta. É correção de dado no banco, não de bug em produção.
--
-- ── O QUE SE CONFIRMOU ──────────────────────────────────────────────────────
--
-- ERRO REAL, sistemático, nas pastas de amendoim: a conversão de grama pra
-- miligrama foi feita com fator 100 em vez de 1000, deixando todos os valores
-- 10× menores. Confirmado em duas amostras independentes, indo ao registro
-- original do Open Food Facts:
--
--   Da Nona (90071)   OFF: sódio 0,018288 g = 18,3 mg → base tinha 1,8  (÷10)
--   Power One (90069) OFF: sal 0,022 g ⇒ sódio 8,8 mg → base tinha 0,9  (÷10)
--
-- Dois de dois com o mesmo fator, no mesmo lote de itens. Corrigido abaixo.
--
-- ── O QUE SE CONFIRMOU CERTO (não mexer) ────────────────────────────────────
--
--   Pães de forma (90024-90042), 160-590 mg .... faixa correta pra pão
--   Requeijões (90090-90093), 500-560 mg ....... bate com rótulo (Frimesa
--                                                light: 162 mg/30 g = 540/100 g)
--   Atuns (90080-90088), 147-585 mg ............ faixa correta pra enlatado
--   Iogurtes naturais (90055-90065), 29-74 mg .. faixa correta
--   Barras de proteína (90043-90054), 84-256 mg  faixa correta
--   Nescau (90097), 50 mg ...................... OFF traz 0,051 g = 51 mg ✓
--   Pastas com sódio 0 (90068, 90073-90076, 90078)  o rótulo é 0 mesmo:
--       são pastas 100% amendoim sem sal. Conferido no registro da Guimarães
--       integral, que traz sódio 0 g e sal 0 g. Não são erro de conversão.
--
-- ── O QUE FICOU PENDENTE (não corrigido, falta rótulo) ──────────────────────
--
--   90095/90096  Leite de aveia, 16 e 16,5 mg. Se o mesmo fator 10 se aplicar,
--                seriam 160/165 mg — plausível pra bebida vegetal com sal
--                adicionado, mas também é plausível que 16 esteja certo pras
--                versões sem sal. Sem o rótulo não dá pra decidir, e chutar
--                aqui seria pior que deixar como está.
--   90098-90103  Achocolatados com 0 mg (menos o Nescau, que confere). Um
--                achocolatado em pó tem pouco sódio mesmo (Nescau: 51 mg), mas
--                zero exato em seis produtos seguidos parece campo vazio do
--                OFF virando 0, não medição.
--   90067        "Granola, crocante" com 0 mg — item sem marca no nome, único
--                do lote nessa condição.
--   90206        Aveia Nestlé com 0 mg — aveia pura tem ~2-5 mg, então 0 está
--                praticamente certo; deixado como está.
--
-- Os seeds originais não guardam o EAN de cada item, então reencontrar o
-- registro exato do OFF pra cada pendência depende de busca por nome, com
-- risco de pegar o produto errado. O caminho limpo pra fechar essas é o mesmo
-- que resolveu o pão: foto do rótulo.

-- ===== Correção do fator 10 nas pastas de amendoim =====

-- Valores lidos direto do registro do Open Food Facts (leitura individual):
update foods set sodium_per_100g = 18.3 where taco_id = 90071; -- Da Nona: OFF 0,018288 g
update foods set sodium_per_100g = 8.8  where taco_id = 90069; -- Power1One: OFF sal 0,022 g

-- Correção do mesmo fator 10 aplicada aos três itens restantes do lote. NÃO é
-- leitura de rótulo individual: é o erro aritmético comprovado acima, desfeito.
-- Os valores resultantes são nutricionalmente plausíveis (pasta com whey tem
-- mais sódio que pasta pura, porque o whey traz sódio). Se algum dia aparecer
-- o rótulo destes três, vale reconferir.
update foods set sodium_per_100g = 8.8  where taco_id = 90077; -- Power1One crocante (mesma formulação da 90069)
update foods set sodium_per_100g = 17    where taco_id = 90070; -- Guimarães com cacau
update foods set sodium_per_100g = 107   where taco_id = 90072; -- Santo Antônio com whey

-- ===== Valor claramente errado, sem substituto confiável =====

-- Requeijão cremoso light: 0 mg é impossível. Os outros quatro requeijões da
-- base ficam em 500-560 mg e o rótulo da Frimesa light dá 540 mg/100 g. Como
-- não achei o rótulo desta marca, vai a NULL: "não sei" é honesto, "não tem
-- sódio" é uma afirmação falsa sobre o alimento.
update foods set sodium_per_100g = null where taco_id = 90094; -- Vale do Pardo

-- Confere o resultado:
--   select taco_id, name, sodium_per_100g from foods
--   where taco_id in (90069,90070,90071,90072,90077,90094) order by taco_id;
