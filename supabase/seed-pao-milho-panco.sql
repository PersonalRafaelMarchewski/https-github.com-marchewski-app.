-- Pão de Milho da Panco (pacote 500 g, EAN 7891203010209) — pedido do Rafa.
-- Não existia nenhum pão de milho na base: dos 19 pães de forma de marca já
-- cadastrados, nenhum é de milho.
--
-- FONTE PRIMÁRIA: foto do rótulo real da embalagem, enviada pelo Rafa em
-- 24/08/2026. É a melhor fonte possível — vale mais que qualquer agregador.
--
--   Porções por embalagem: 10 · Porção: 50 g (1 + 1/4 fatia)
--   Por 100 g: 301 kcal · Carboidratos 56 · Açúcares totais 15 (adicionados 8,2)
--   Proteínas 8,3 · Gorduras totais 4,9 (sat 2,1 / trans 0 / mono 1,7 / poli 1,2)
--   Colesterol 5,6 mg · Fibras alimentares 2,2 · Sódio 307 mg
--
-- SEGUNDA FONTE (conferência): Open Food Facts, mesmo EAN 7891203010209.
-- Bateu exatamente em energia (301), proteína (8,3), carboidrato (56),
-- açúcares (15), gordura (4,9), saturada (2,1) e fibra (2,2).
--
--   ⚠ MAS O SÓDIO DO OPEN FOOD FACTS ESTÁ ERRADO. O registro lá traz
--   "sal 0,307 g" e daí deriva "sódio 0,1228 g" (123 mg). Na verdade os
--   307 mg do rótulo SÃO o sódio, não o sal — o contribuidor leu o campo
--   errado. O valor correto, do rótulo, é 307 mg de sódio por 100 g, que é
--   também o que faz sentido perto dos outros pães da base (310-590 mg).
--   Ficou o valor do rótulo. Isso é a mesma classe de erro suspeita nos
--   itens de marca já cadastrados (ver auditoria pendente do sódio).
--
-- ── CONVENÇÃO DE CARBOIDRATO ────────────────────────────────────────────────
-- Rótulo brasileiro (ANVISA) declara carboidrato SEM a fibra; TACO e USDA
-- declaram COM. A base segue TACO, então o valor abaixo é o TOTAL:
--
--   56 (rótulo) + 2,2 (fibra) = 58,2 g de carboidrato total
--
-- Conferência por Atwater (P×4 + carboidrato disponível×4 + fibra×2 + G×9):
--   8,3×4 + 56×4 + 2,2×2 + 4,9×9 = 33,2 + 224 + 4,4 + 44,1 = 305,7 kcal
--   Rótulo: 301 kcal — diferença de 1,6%, dentro da tolerância. ✓
--
-- NOME: o nome comercial na embalagem é "Pão de Milho" (linha de pães
-- caseiros da Panco), não "pão de forma". Cadastrado como "Pão de forma,
-- milho, Panco" de propósito: é assim que o Rafa procura, e o FoodPicker
-- busca por substring do nome inteiro — com o nome comercial puro, digitar
-- "pão de forma" não acharia este item.
--
-- taco_id 90208 (o maior em uso era 90207). Insert idempotente.

insert into foods (taco_id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sodium_per_100g)
values
-- EAN 7891203010209 — rótulo por 100 g: 301 kcal, P 8,3, C 56 (+2,2 fibra = 58,2 total), G 4,9, Na 307 mg
(90208, 'Pão de forma, milho, Panco', 'Cereais e derivados', 301, 8.3, 58.2, 4.9, 2.2, 307)
on conflict (taco_id) do nothing;

-- 1 fatia = 40 g. Vem direto do rótulo: a porção declarada é 50 g = 1 + 1/4
-- fatia, logo 50 / 1,25 = 40 g por fatia. Confere com o pacote: 500 g / 40 g
-- = 12,5 fatias. Fatia maior que a dos pães de forma comuns da base (25 g)
-- porque é um pão caseiro, de fatia mais grossa.
update foods set unit_weight_g = 40 where taco_id = 90208;
