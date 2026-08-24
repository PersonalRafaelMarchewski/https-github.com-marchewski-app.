-- Linha SuperCoffee (Caffeine Army) — os 9 sabores do pó de 220 g.
--
-- FONTE: tabela nutricional publicada pelo próprio fabricante, na página de
-- cada sabor em caffeinearmy.com.br. É o rótulo do produto, fonte primária.
-- Consultado em 24/08/2026, sabor por sabor — não extrapolei nenhum valor de
-- um sabor pro outro.
--
-- PORÇÃO: 10 g. O rótulo declara os valores por dose; a embalagem de 220 g
-- traz "22 doses", logo 220 / 22 = 10 g por dose. As páginas de Doce de
-- Leite, Língua de Gato e Lajotinha declaram os 10 g explicitamente, o que
-- confirma a conta. Os valores abaixo são a tabela do rótulo × 10.
--
-- ── CONVENÇÃO DE CARBOIDRATO ────────────────────────────────────────────────
-- Rótulo ANVISA declara carboidrato SEM fibra; a base segue TACO/USDA, que
-- declaram COM. Todos os valores abaixo são carboidrato TOTAL (rótulo+fibra).
-- A fibra continua na sua coluna. Ex. Original: 13 + 3 = 16 g.
--
-- CONFERÊNCIA POR ATWATER (P×4 + carb disponível×4 + fibra×2 + G×9), por dose
-- de 10 g, contra o kcal declarado no rótulo:
--   Original       8,0+5,2+0,6+36,0 = 49,8  rótulo 49  (+1,6%)
--   Chocolate      8,0+5,6+0,4+36,0 = 50,0  rótulo 50  ( 0,0%)
--   Doce de leite  5,6+5,2+0,0+34,2 = 45,0  rótulo 45  ( 0,0%)
--   Vanilla Latte  8,0+6,0+0,6+36,0 = 50,6  rótulo 50  (+1,2%)
--   Pistache       5,6+8,0+0,0+40,5 = 54,1  rótulo 54  (+0,2%)
--   Língua de gato 6,4+8,4+0,6+34,2 = 49,6  rótulo 49  (+1,2%)
--   Beijinho       5,6+8,0+0,2+39,6 = 53,4  rótulo 52  (+2,7%)
--   Choconilla     8,0+5,6+0,4+36,0 = 50,0  rótulo 50  ( 0,0%)
--   Lajotinha      7,6+7,2+0,0+32,4 = 47,2  rótulo 49  (-3,7%)
-- Sete dos nove fecham dentro de 2%. Beijinho e Lajotinha ficam um pouco
-- fora, o que é normal em rótulo (arredondamento de cada linha da tabela) e
-- não indica valor errado — os dois seguem coerentes com os irmãos da linha.
--
-- ⚠ CHOCONILLA: a tabela publicada é idêntica à do Chocolate em todos os
-- campos (50 kcal, C 1,4, P 2, G 4, sat 3,3, fibra 0,2, Na 17). Pode ser a
-- mesma base de formulação, ou a página do Choconilla repetindo a tabela do
-- Chocolate. Entrou como está, mas se for prescrever esse sabor especificamente,
-- vale conferir na embalagem.
--
-- NOME: o nome comercial é "SuperCoffee", tudo junto. Cadastrado com espaço,
-- "Super Coffee", porque a busca do FoodPicker é substring literal (só tira
-- acento e minúsculo, não normaliza espaço) — e é assim que o Rafa digita.
-- Com o nome junto, quem digitasse "super coffee" não acharia nada. Buscar
-- por "super", "coffee" ou "caffeine" acha os nove de qualquer forma.
--
-- Fora do escopo deste seed: o SuperCoffee To Go (bebida pronta, outra
-- composição) e os demais produtos da Caffeine Army (SuperWhey, SuperPasta
-- etc.). Se quiser, entram num seed próprio.
--
-- taco_id 90210-90218 (o maior em uso era 90209). Insert idempotente.

insert into foods (taco_id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sodium_per_100g)
values
-- rótulo por dose de 10 g → ×10. Carboidrato já somado com a fibra.
(90210, 'Super Coffee, original, Caffeine Army',        'Suplementos', 490, 20,   16, 40,   3, 100), -- 49 kcal/dose · C 1,3 +0,3 fib
(90211, 'Super Coffee, chocolate, Caffeine Army',       'Suplementos', 500, 20,   16, 40,   2, 170), -- 50 · C 1,4 +0,2
(90212, 'Super Coffee, doce de leite, Caffeine Army',   'Suplementos', 450, 14,   13, 38,   0, 110), -- 45 · C 1,3 +0
(90213, 'Super Coffee, vanilla latte, Caffeine Army',   'Suplementos', 500, 20,   18, 40,   3, 110), -- 50 · C 1,5 +0,3
(90214, 'Super Coffee, pistache, Caffeine Army',        'Suplementos', 540, 14,   20, 45,   0, 120), -- 54 · C 2,0 +0
(90215, 'Super Coffee, língua de gato, Caffeine Army',  'Suplementos', 490, 16,   24, 38,   3, 110), -- 49 · C 2,1 +0,3
(90216, 'Super Coffee, beijinho, Caffeine Army',        'Suplementos', 520, 14,   21, 44,   1, 110), -- 52 · C 2,0 +0,1
(90217, 'Super Coffee, choconilla, Caffeine Army',      'Suplementos', 500, 20,   16, 40,   2, 170), -- 50 · C 1,4 +0,2 (ver nota)
(90218, 'Super Coffee, lajotinha, Caffeine Army',       'Suplementos', 490, 19,   18, 36,   0, 170)  -- 49 · C 1,8 +0
on conflict (taco_id) do nothing;

-- 1 dose = 10 g, o próprio scoop do produto. Assim o Rafa prescreve "1 dose"
-- em vez de pesar o pó.
update foods set unit_weight_g = 10 where taco_id between 90210 and 90218;
