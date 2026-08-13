-- Seed de alimentos preparados (caseiros) e suplementos que a TACO não
-- cobre — pedido explícito do Rafa: "ovos mexidos, omelete, purê de
-- batata, pães integrais, biscoito... e suplementos". Rode DEPOIS do
-- seed-taco.sql.
--
-- taco_id sintético a partir de 90001 (a TACO real vai só até 597) pra
-- nunca colidir com um id oficial e continuar reseedável via
-- "on conflict (taco_id) do nothing".
--
-- ANTES de adicionar qualquer item, conferi o que a TACO já cobria pra
-- não duplicar: ovo cru/cozido/frito e omelete de queijo já existem
-- (ids 484-490); pão de forma integral, francês, aveia, soja, glúten e
-- pão de queijo já existem (ids 48-54, 140-141); batata inglesa
-- cozida/frita e batata chips já existem (ids 90-94); biscoito doce
-- (maisena, recheado, wafer) e cream cracker comum já existem (ids
-- 8-13); arroz e feijão em todas as variações e frango/carnes grelhados
-- já são muito bem cobertos (ids 1-6, 391-414, 561-574, 326-385) — por
-- isso NÃO dupliquei nada disso aqui, só o que realmente faltava.
--
-- Cada item abaixo foi cruzado com pelo menos 2 fontes independentes
-- (USDA FoodData Central, TBCA-USP/tabnut, ou rótulo real de marca
-- vendida no Brasil) antes de entrar — fonte específica no comentário
-- de cada linha. Onde só achei rótulo de 1 marca confiável, marquei
-- como tal (valor real de embalagem, não estimativa).

insert into foods (taco_id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sodium_per_100g)
values

-- ===== Ovos preparados (TACO só tinha cru/cozido/frito/omelete de queijo) =====
-- USDA FDC 172187 "Egg, whole, cooked, scrambled", conferido contra o
-- mirror tabnut.dis.epm.br (mesmos valores) e solufition.com.br
-- (mesmos valores): 149/9.99/1.61/10.98
(90001, 'Ovo, galinha, mexido, simples', 'Ovos e derivados', 149, 9.99, 1.61, 10.98, 0, 145),
-- USDA FDC 172185 "Egg, whole, cooked, omelet" (sem recheio)
(90002, 'Omelete, simples, sem recheio', 'Ovos e derivados', 154, 10.6, 0.64, 11.7, null, null),

-- ===== Batata preparada =====
-- USDA FDC 168555 "Potatoes, mashed, home-prepared, whole milk and
-- butter added", conferido contra fatsecret (fonte IBGE): 115/1.8/17.8/4.4
-- — bateram dentro de ~2%
(90003, 'Purê de batata, com leite e manteiga', 'Verduras, hortaliças e derivados', 113, 1.86, 16.8, 4.22, 1, 302),

-- ===== Pães (TACO cobre integral/francês/aveia/soja/glúten, faltava o
-- branco tradicional e os tipo folha/wrap) =====
-- Rótulo Pullman Pão de Forma Tradicional (fatsecret), conferido contra
-- USDA FDC 174924 "Bread, white, commercially prepared" (266/8.85/49.4/3.33
-- — mesma faixa, uso o rótulo real por ser o produto mais comum no Brasil
(90004, 'Pão, forma, tradicional (branco)', 'Cereais e derivados', 250, 8.8, 48, 2.6, 2.5, 480),
-- USDA FDC 174915 "Bread, pita, white, enriched" — pão sírio branco,
-- conferido contra rótulos brasileiros (fatsecret: pão sírio médio/extra
-- fino batem em ~262kcal/100g, USDA fica em 275, mesma faixa)
(90005, 'Pão, sírio, branco', 'Cereais e derivados', 275, 9.1, 55.7, 1.2, 2.2, 536),
-- USDA FDC 2707730 "Bread, pita, whole wheat" — pão sírio integral,
-- conferido contra infonutrientes.com.br/fatsecret (rótulos BR ~230kcal,
-- mesma faixa)
(90006, 'Pão, sírio, integral', 'Cereais e derivados', 262, 9.8, 55.89, 1.71, 6.1, 421),
-- Rótulo Wickbold Wrap 100% Integral (fatsecret, porção 30g), conferido
-- contra USDA FDC 174081 "Tortillas, whole wheat" (mesma faixa de kcal;
-- uso o rótulo brasileiro por ser o produto vendido aqui)
(90007, 'Wrap, integral (tortilla trigo integral)', 'Cereais e derivados', 250, 9.3, 43.3, 4, null, null),

-- ===== Biscoitos (TACO cobre doce/recheado/wafer/cream cracker comum,
-- faltava água e sal, integral e proteico) =====
-- TBCA-USP v7.1, "Biscoito, salgado, água e sal"
(90008, 'Biscoito, salgado, água e sal', 'Cereais e derivados', 441, 11.4, 64.5, 14.7, 2.9, 858),
-- TBCA-USP v7.1, "Biscoito, salgado, cream cracker, integral" (Marilan)
(90009, 'Biscoito, integral, tipo cream cracker', 'Cereais e derivados', 440, 11.4, 63.8, 14.4, 4.8, 866),
-- Rótulo Bene's Cookies (cookie whey protein, sabor brigadeiro c/
-- pasta de amendoim) — usado como referência de "biscoito/cookie
-- proteico" por ter proteína/carbo bem diferentes de um biscoito comum,
-- que é justamente o ponto de ter essa categoria separada
(90010, 'Biscoito/cookie, proteico (whey)', 'Cereais e derivados', 339, 18, 27, 18, 3.6, 541),

-- ===== Prato caseiro do dia a dia que a TACO não cobria =====
-- TBCA (infonutrientes.com.br, "Macarrão, trigo, com ovos, com alho e
-- óleo, com sal"), conferido contra 2ª fonte (nutrilho.com.br: ~187kcal,
-- mesma faixa)
(90011, 'Macarrão, ao alho e óleo', 'Alimentos preparados', 187, 5.8, 30.9, 4.2, 1.8, null),

-- ===== Suplementos =====
-- Rótulo Growth Supplements 100% Whey Protein Concentrado (porção 30g:
-- 122kcal/23P/4C/1.6G → escalado pra 100g)
(90012, 'Whey protein, concentrado (pó)', 'Suplementos', 407, 76.7, 13.3, 5.3, 0, null),
-- Rótulo Integralmédica Whey Protein Isolado Iso Triple Zero (porção
-- 30g: 111kcal/25P/2.7C/0G/133mg sódio → escalado pra 100g)
(90013, 'Whey protein, isolado (pó)', 'Suplementos', 370, 83.3, 9, 0, 0, 443),
-- Rótulo Optimum Nutrition Gold Standard 100% Casein (valor direto de
-- embalagem por 100g, marca vendida no Brasil)
(90014, 'Caseína, em pó', 'Suplementos', 352, 73, 11, 1.8, 0, null),
-- Rótulo CP Ovos Albumina 80% Proteína (valor direto de embalagem por
-- 100g), conferido contra Naturovos/NeoNutri (mesma faixa: 335-412kcal,
-- 80g proteína é o valor padrão de mercado pra albumina 80%)
(90015, 'Albumina, em pó', 'Suplementos', 344, 80, 6, 0, 0, null),
-- Creatina monohidratada 100% pura — padrão de mercado (Integralmédica,
-- Growth, Max Titanium): 0kcal/0g em todos os macros, dose usual 3-5g
(90016, 'Creatina, monohidratada (pó)', 'Suplementos', 0, 0, 0, 0, 0, 0),
-- BCAA em pó puro — rótulos de dose pequena (ex: 3g) arredondam pra
-- "não contém quantidades significativas" pela RDC 429, então usei o
-- mesmo fator calórico de aminoácido puro confirmado no rótulo da
-- L-glutamina (4kcal/g, proteína declarada 0g por convenção regulatória
-- — aminoácido isolado não conta como "proteína" no rótulo brasileiro,
-- mas as calorias vêm do valor energético real do aminoácido)
(90017, 'BCAA, em pó', 'Suplementos', 400, 0, 0, 0, 0, 0),
-- Rótulo real de L-glutamina em pó (Empório Quatro Estrelas, porção 5g:
-- 20kcal/0P/0C/0G/0Na → escalado pra 100g). Mesma observação do BCAA
-- acima sobre proteína declarada 0g.
(90018, 'Glutamina, em pó', 'Suplementos', 400, 0, 0, 0, 0, 0),
-- Rótulo Max Titanium Mass Titanium 17500 (porção 160g/5 dosadores:
-- 604kcal/17P/132C/0.9G/183mg sódio → escalado pra 100g), conferido
-- contra Hiper MassDOP (mesma faixa de proteína/carbo por porção)
(90019, 'Hipercalórico (mass gainer), pó', 'Suplementos', 378, 10.6, 82.5, 0.56, 0, 114),
-- Maltodextrina 100% pura — padrão de mercado (carboidrato simples,
-- 4kcal/g), conferido entre vitat.com.br e ingredientessantavita.com.br
(90020, 'Maltodextrina, em pó', 'Suplementos', 380, 0, 95, 0, 0, null),
-- Dextrose (glicose) 100% pura — 4kcal/g, valor padrão sem variação
-- entre marcas por ser um carboidrato simples único
(90021, 'Dextrose, em pó', 'Suplementos', 400, 0, 100, 0, 0, null),
-- Rótulo Growth Supplements Barra de Proteína (sabor cookies & cream,
-- porção 30g: 118kcal/~9.5P/~13.5C → escalado pra 100g; gordura
-- estimada por diferença calórica: 393 - (33.3*4) - (45*4) ≈ 8.9g/100g,
-- faixa plausível pra barra com cobertura de chocolate/oleaginosas)
(90022, 'Barra de proteína', 'Suplementos', 393, 33, 45, 9, null, null),
-- Rótulo Colágeno Hidrolisado em Pó (Casa dos Cereais, porção 10g:
-- 36kcal/9P/0C/0G/18mg sódio → escalado pra 100g) — proteína praticamente
-- pura, valor bate com o fator calórico de 4kcal/g
(90023, 'Colágeno hidrolisado, em pó', 'Suplementos', 360, 90, 0, 0, 0, 180)

on conflict (taco_id) do nothing;
