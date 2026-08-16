-- Aveia e granola de marca (escolha do Rafa: Nestlé e Kodilar), mais a
-- correção de um erro encontrado na auditoria.
--
-- ── CONVENÇÃO DE CARBOIDRATO (importante) ───────────────────────────────────
-- Rótulo brasileiro (ANVISA) declara "carboidratos" SEM a fibra; TACO e USDA
-- declaram COM a fibra (carboidrato por diferença). Como 596 dos 800 alimentos
-- da base são TACO, os itens abaixo foram convertidos para carboidrato TOTAL
-- (= carboidrato do rótulo + fibra), pra que a soma diária do plano fique
-- comparável entre alimentos. A fibra continua na sua própria coluna.
--
--   Nestlé aveia flocos finos: rótulo 53,3 C + 11,3 fibra -> 64,6 C total
--   Kodilar granola:           rótulo 65,0 C +  8,25 fibra -> 73,3 C total
--
-- Conferência por Atwater (P×4 + carboidrato disponível×4 + fibra×2 + G×9),
-- que é o que reconstrói a energia do rótulo:
--   Nestlé: 15,3×4 + 53,3×4 + 11,3×2 + 7,7×9 = 366 kcal (rótulo: 367) ✓
--   Kodilar: 8,5×4 + 65×4 + 8,25×2 + 8,25×9 = 385 kcal (rótulo: 380) ✓
--
-- Fonte dos rótulos: Open Food Facts, códigos de barras abaixo. Os valores da
-- Nestlé conferem entre quatro registros independentes do mesmo produto
-- (7891000102626, 7891000102640, 7891000370643, 7891000380994).

insert into foods (taco_id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sodium_per_100g)
values
-- EAN 7891000102626 — rótulo por porção de 30 g: 110 kcal, P 4,6, C 16, G 2,3, fibra 3,4
(90206, 'Aveia, flocos finos, Nestlé', 'Cereais e derivados', 367, 15.3, 64.6, 7.7, 11.3, 0),
-- EAN 7896256041866 — NaturalLife Granola Castanhas Nobres
(90207, 'Granola, castanhas nobres, NaturalLife, Kodilar', 'Cereais e derivados', 380, 8.5, 73.3, 8.3, 8.3, 40)
on conflict (taco_id) do nothing;

-- ── CORREÇÃO ────────────────────────────────────────────────────────────────
-- "Pão de forma, sanduíche, Marilan" (taco_id 90029) estava com 390 kcal/100g.
-- Os próprios macros declarados dão 263 kcal (8,4×4 + 52×4 + 2,4×9), e todos os
-- pães de forma brancos da base ficam entre 244 e 276 kcal. O erro veio da
-- origem: o registro no Open Food Facts (EAN 7891193010074) traz 390 kcal com
-- esses mesmos macros — é internamente inconsistente lá também.
-- Prescrever 100 g deste pão estava superestimando em ~127 kcal.
-- Novo valor derivado dos macros do próprio produto.
update foods set calories_per_100g = 263 where taco_id = 90029 and calories_per_100g = 390;
