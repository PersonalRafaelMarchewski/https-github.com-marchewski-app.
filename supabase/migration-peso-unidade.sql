-- Peso padrão de "1 unidade" pra alimentos que fazem sentido contar (ex:
-- 1 ovo, 1 banana, 1 fatia de pão) — o aluno/personal só diz "quantos",
-- sem precisar saber ou digitar quantos gramas tem. Rode no SQL Editor
-- do Supabase.
--
-- Pesos cruzados com pelo menos 2 fontes quando possível (guiadanutri.com,
-- ANVISA/RDC pra pão francês, cursos de fruticultura/CEAGESP pra frutas).
-- Fruta e pão de verdade variam de peso — os valores aqui são "típico
-- médio", não uma medida exata; dá pra ajustar direto no banco se quiser
-- afinar depois.

alter table foods add column if not exists unit_weight_g numeric;

-- ===== Ovos (1 unidade média = 50g; clara/gema proporcionais) =====
update foods set unit_weight_g = 50 where taco_id in (488, 489, 490, 90001); -- inteiro cozido/cru/frito/mexido
update foods set unit_weight_g = 33 where taco_id = 486; -- clara cozida (~2/3 de um ovo de 50g)
update foods set unit_weight_g = 17 where taco_id = 487; -- gema cozida (~1/3 de um ovo de 50g)
update foods set unit_weight_g = 10 where taco_id = 485; -- ovo de codorna

-- ===== Bananas (unidade descascada, guiadanutri.com + mundoboaforma.com.br) =====
update foods set unit_weight_g = 75 where taco_id = 182; -- prata
update foods set unit_weight_g = 90 where taco_id = 179; -- nanica
update foods set unit_weight_g = 55 where taco_id = 178; -- maçã
update foods set unit_weight_g = 40 where taco_id = 180; -- ouro
update foods set unit_weight_g = 35 where taco_id = 177; -- figo
update foods set unit_weight_g = 200 where taco_id = 181; -- pacova
update foods set unit_weight_g = 200 where taco_id = 175; -- da terra (varia bastante, 150-300g)

-- ===== Outras frutas (unidade média, guiadanutri.com) =====
update foods set unit_weight_g = 130 where taco_id in (221, 222); -- maçã (Argentina, Fuji)
update foods set unit_weight_g = 135 where taco_id in (208, 210, 212, 214, 216); -- laranja crua (baía, da terra, lima, pêra, valência)
update foods set unit_weight_g = 130 where taco_id in (242, 243); -- pêra (Park, Williams)
update foods set unit_weight_g = 12 where taco_id = 239; -- morango
update foods set unit_weight_g = 123 where taco_id in (157, 161); -- tomate (com semente, salada) — referência USDA

-- ===== Pães (ANVISA/RDC pro francês; padaria pro pão de queijo; fatia padrão pros de forma) =====
update foods set unit_weight_g = 50 where taco_id = 53; -- trigo, francês
update foods set unit_weight_g = 40 where taco_id in (140, 141); -- de queijo, assado/cru
update foods set unit_weight_g = 50 where taco_id in (90005, 90006); -- sírio, branco/integral
update foods set unit_weight_g = 25 -- fatia de pão de forma
  where taco_id in (48, 49, 50, 51, 52, 54, 90004); -- aveia, soja, glúten, milho, trigo integral, sovado, forma tradicional

-- ===== Biscoitos/bolachas (1 unidade do biscoito, não a porção da embalagem) =====
update foods set unit_weight_g = 7 where taco_id in (13, 90008, 90009); -- cream cracker, água e sal, integral cream cracker
update foods set unit_weight_g = 6 where taco_id = 8; -- doce, maisena
update foods set unit_weight_g = 8 where taco_id in (9, 10, 11, 12); -- recheado chocolate/morango, wafer recheado chocolate/morango
update foods set unit_weight_g = 15 where taco_id = 99; -- polvilho doce
