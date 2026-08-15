-- Ampliação da base de alimentos para prescrição alimentar — 70 itens que
-- faltavam na TACO (edição 2011) e que aparecem o tempo todo em dieta de
-- consultório: quinoa, cuscuz marroquino, aveia em farelo, macarrão COZIDO
-- (a TACO só traz cru), cogumelos, frutas vermelhas, frutas secas, oleaginosas
-- cruas, iogurte grego, cottage, tilápia, grão-de-bico cozido, óleo de coco,
-- cacau em pó, entre outros.
--
-- FONTE PRIMÁRIA: USDA FoodData Central (SR Legacy / Foundation Foods) —
-- obra do governo dos EUA, domínio público, sem restrição de uso comercial.
-- Valores por 100 g de parte comestível; carboidrato por diferença (inclui
-- fibra), mesmo critério da TACO já usada na tabela.
--
-- SEGUNDA FONTE (conferência, conforme convenção do projeto): TBCA
-- (Tabela Brasileira de Composição de Alimentos, USP/FoRC), consultada item a
-- item numa amostra. Bateram exatamente: quinoa crua (P 14,1 / C 64,2 /
-- G 6,07 / fibra 7,0 / Na 5), chia seca (P 16,5 / C 42,1 / G 30,7 /
-- fibra 34,4), iogurte grego integral (97 kcal / P 9,0 / C 3,98 / G 5,0).
-- Diferenças pequenas e esperadas em tilápia crua (TBCA 93 kcal / P 18,1 —
-- amostra brasileira; USDA 96 kcal / P 20,1) e cogumelo Paris cru
-- (TBCA 27 kcal; USDA 22 kcal). Ficou o valor do USDA por coerência de fonte.
--
-- O único item da lista sem equivalente no USDA é o queijo coalho, que veio
-- da TBCA (dado brasileiro, não há correspondente americano).
--
-- taco_id a partir de 90122 (o maior em uso era 90121). Insert idempotente.
-- Rode DEPOIS de migration-nutricao.sql.

insert into foods (taco_id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sodium_per_100g)
values
-- Cereais e derivados
(90122, 'Quinoa, grão, crua', 'Cereais e derivados', 368, 14.1, 64.2, 6.07, 7, 5),
(90123, 'Quinoa, grão, cozida', 'Cereais e derivados', 120, 4.4, 21.3, 1.92, 2.8, 7),
(90124, 'Cuscuz marroquino, cozido', 'Cereais e derivados', 112, 3.79, 23.2, 0.16, 1.4, 5),
(90125, 'Aveia, farelo, cru', 'Cereais e derivados', 246, 17.3, 66.2, 7.03, 15.4, 4),
-- 90126 ficou vago de propósito: era "Aveia, farelo, cozido", removido porque
-- USDA (40 kcal/100g) e TBCA (94 kcal/100g) discordam por proporção de água no
-- preparo, não por dado. Farelo de aveia se prescreve em peso seco (90125).
(90127, 'Macarrão, trigo, cozido', 'Cereais e derivados', 158, 5.8, 30.9, 0.93, 1.8, 1),
(90128, 'Macarrão, integral, cozido', 'Cereais e derivados', 149, 5.99, 30.1, 1.71, 3.9, 4),
(90129, 'Biscoito de arroz integral (galeta), sem sal', 'Cereais e derivados', 387, 8.2, 81.5, 2.8, 4.2, 26),
(90130, 'Pipoca, estourada com ar quente, sem óleo', 'Cereais e derivados', 387, 12.9, 77.8, 4.54, 14.5, 8),

-- Verduras, hortaliças e derivados
(90131, 'Cogumelo, Paris (champignon), cru', 'Verduras, hortaliças e derivados', 22, 3.09, 3.26, 0.34, 1, 5),
(90132, 'Cogumelo, Paris (champignon), cozido', 'Verduras, hortaliças e derivados', 28, 2.17, 5.29, 0.47, 2.2, 2),
(90133, 'Cogumelo, shiitake, cru', 'Verduras, hortaliças e derivados', 34, 2.24, 6.79, 0.49, 2.5, 9),
(90134, 'Aspargo, cozido', 'Verduras, hortaliças e derivados', 22, 2.4, 4.11, 0.22, 2, 14),
(90135, 'Couve de Bruxelas, cozida', 'Verduras, hortaliças e derivados', 36, 2.55, 7.1, 0.5, 2.6, 21),
(90136, 'Ervilha, fresca, cozida', 'Verduras, hortaliças e derivados', 84, 5.36, 15.6, 0.22, 5.5, 3),
(90137, 'Milho, verde, cozido', 'Verduras, hortaliças e derivados', 96, 3.41, 21, 1.5, 2.4, 1),
(90138, 'Espinafre, comum, cozido', 'Verduras, hortaliças e derivados', 23, 2.97, 3.75, 0.26, 2.4, 70),
(90139, 'Batata, doce, assada com casca', 'Verduras, hortaliças e derivados', 90, 2.01, 20.7, 0.15, 3.3, 36),

-- Frutas e derivados
(90140, 'Mirtilo (blueberry), cru', 'Frutas e derivados', 57, 0.74, 14.5, 0.33, 2.4, 1),
(90141, 'Amora, crua', 'Frutas e derivados', 43, 1.39, 9.61, 0.49, 5.3, 1),
(90142, 'Framboesa, crua', 'Frutas e derivados', 52, 1.2, 11.9, 0.65, 6.5, 1),
(90143, 'Cereja, doce, crua', 'Frutas e derivados', 63, 1.06, 16, 0.2, 2.1, 0),
(90144, 'Uva passa, escura, sem semente', 'Frutas e derivados', 299, 3.3, 79.3, 0.25, 4.5, 26),
(90145, 'Damasco, seco', 'Frutas e derivados', 241, 3.39, 62.6, 0.51, 7.3, 10),
(90146, 'Tâmara, Medjool', 'Frutas e derivados', 277, 1.81, 75, 0.15, 6.7, 1),
(90147, 'Ameixa, seca', 'Frutas e derivados', 240, 2.18, 63.9, 0.38, 7.1, 2),
(90148, 'Banana passa (desidratada)', 'Frutas e derivados', 346, 3.89, 88.3, 1.81, 9.9, 3),
(90149, 'Coco, ralado, seco, sem açúcar', 'Frutas e derivados', 660, 6.88, 23.6, 64.5, 16.3, 37),

-- Nozes e sementes
(90150, 'Chia, semente, seca', 'Nozes e sementes', 486, 16.5, 42.1, 30.7, 34.4, 16),
(90151, 'Semente de girassol, sem casca, seca', 'Nozes e sementes', 584, 20.8, 20, 51.5, 8.6, 9),
(90152, 'Semente de abóbora, sem casca, seca', 'Nozes e sementes', 559, 30.2, 10.7, 49, 6, 7),
(90153, 'Amêndoa, crua', 'Nozes e sementes', 579, 21.2, 21.6, 49.9, 12.5, 1),
(90154, 'Castanha-de-caju, crua', 'Nozes e sementes', 553, 18.2, 30.2, 43.8, 3.3, 12),
(90155, 'Avelã, crua', 'Nozes e sementes', 628, 15, 16.7, 60.8, 9.7, 0),
(90156, 'Pistache, cru', 'Nozes e sementes', 560, 20.2, 27.2, 45.3, 10.6, 1),
(90157, 'Macadâmia, crua', 'Nozes e sementes', 718, 7.91, 13.8, 75.8, 8.6, 5),
(90158, 'Noz pecã, crua', 'Nozes e sementes', 691, 9.17, 13.9, 72, 9.6, 0),

-- Leite e derivados
(90159, 'Iogurte, grego, natural, integral', 'Leite e derivados', 97, 9, 3.98, 5, 0, 35),
(90160, 'Iogurte, grego, natural, desnatado', 'Leite e derivados', 59, 10.2, 3.6, 0.39, 0, 36),
(90161, 'Queijo, cottage, integral', 'Leite e derivados', 98, 11.1, 3.38, 4.3, 0, 315),
(90162, 'Queijo, cottage, light (1% de gordura)', 'Leite e derivados', 72, 12.4, 2.72, 1.02, 0, 406),
(90163, 'Queijo, cheddar', 'Leite e derivados', 403, 22.9, 3.37, 33.3, 0, 653),
(90164, 'Queijo, mussarela, meia gordura', 'Leite e derivados', 254, 24.3, 2.77, 15.9, 0, 619),
-- queijo coalho: fonte TBCA (dado brasileiro), sem equivalente no USDA
(90165, 'Queijo, coalho', 'Leite e derivados', 335, 23.7, 1.94, 25.9, 0, 526),
(90166, 'Cream cheese, tradicional', 'Leite e derivados', 350, 6.15, 5.52, 34.4, 0, 314),
(90167, 'Cream cheese, light', 'Leite e derivados', 208, 7.85, 6.73, 16.7, 0, 317),
(90168, 'Bebida vegetal de amêndoas, sem açúcar', 'Leite e derivados', 15, 0.4, 1.31, 0.96, 0.2, 72),

-- Ovos e derivados
(90169, 'Ovo, de galinha, clara, crua', 'Ovos e derivados', 52, 10.9, 0.73, 0.17, 0, 166),
(90170, 'Ovo, de galinha, inteiro, poché', 'Ovos e derivados', 143, 12.5, 0.71, 9.47, 0, 297),

-- Pescados e frutos do mar
(90171, 'Tilápia, filé, cru', 'Pescados e frutos do mar', 96, 20.1, 0, 1.7, 0, 52),
(90172, 'Tilápia, filé, grelhado', 'Pescados e frutos do mar', 128, 26.2, 0, 2.65, 0, 56),
(90173, 'Salmão, defumado', 'Pescados e frutos do mar', 117, 18.3, 0, 4.32, 0, 672),

-- Carnes e derivados
(90174, 'Peru, moído, magro (93%), cru', 'Carnes e derivados', 150, 18.7, 0, 8.34, 0, 69),
(90175, 'Carne, bovina, moída magra (93%), grelhada', 'Carnes e derivados', 193, 26.2, 0, 8.94, 0, 66),
(90176, 'Porco, filé mignon (lombinho), assado', 'Carnes e derivados', 143, 26.2, 0, 3.51, 0, 57),

-- Leguminosas e derivados
(90177, 'Grão-de-bico, cozido', 'Leguminosas e derivados', 164, 8.86, 27.4, 2.59, 7.6, 7),
(90178, 'Feijão, branco, cozido', 'Leguminosas e derivados', 139, 9.73, 25.1, 0.35, 6.3, 6),
(90179, 'Edamame (soja verde), cozido', 'Leguminosas e derivados', 121, 11.9, 8.91, 5.2, 5.2, 6),
(90180, 'Homus (pasta de grão-de-bico)', 'Leguminosas e derivados', 237, 7.78, 15, 17.8, 5.5, 426),
(90181, 'Tempeh', 'Leguminosas e derivados', 192, 20.3, 7.64, 10.8, null, 9),
(90182, 'Pasta de amendoim, integral, sem sal', 'Leguminosas e derivados', 598, 22.2, 22.3, 51.4, 5, 17),

-- Gorduras e óleos
(90183, 'Óleo de coco', 'Gorduras e óleos', 892, 0, 0, 99.1, 0, 0),
(90184, 'Manteiga ghee (clarificada)', 'Gorduras e óleos', 876, 0.28, 0, 99.5, 0, 2),

-- Bebidas
(90185, 'Chá verde, infusão', 'Bebidas (alcoólicas e não alcoólicas)', 1, 0.22, 0, 0, 0, 1),
(90186, 'Vinho, tinto, de mesa', 'Bebidas (alcoólicas e não alcoólicas)', 85, 0.07, 2.61, 0, 0, 4),

-- Miscelâneas
(90187, 'Cacau em pó, sem açúcar', 'Miscelâneas', 228, 19.6, 57.9, 13.7, 37, 21),
(90188, 'Canela, em pó', 'Miscelâneas', 247, 3.99, 80.6, 1.24, 53.1, 10),
(90189, 'Vinagre, branco', 'Miscelâneas', 18, 0, 0.04, 0, 0, 2),
(90190, 'Gelatina, dietética, preparada', 'Miscelâneas', 20, 0.83, 4.22, 0, 0, 48),
(90191, 'Adoçante em pó, sucralose', 'Miscelâneas', 336, 0, 91.2, 0, 0, 0),

-- Suplementos
(90192, 'Proteína isolada de soja (pó)', 'Suplementos', 335, 88.3, 0, 3.39, 0, 1000)

on conflict (taco_id) do nothing;
