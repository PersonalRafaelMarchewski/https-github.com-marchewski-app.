-- Alimentos industrializados de consumo comum no dia a dia do brasileiro,
-- que a TACO não cobre: embutidos, molhos/condimentos, salgadinhos,
-- macarrão instantâneo, bebidas e cereal matinal açucarado.
-- Valores por 100g, pesquisados e cruzados com pelo menos 2 fontes
-- (TabelaTACO Online, FatSecret, rótulos de marca via Open Food Facts,
-- páginas de produto oficiais).
--
-- Nota sobre o caldo de galinha em tablete (90114): o valor de sódio é MUITO
-- alto por ser um tempero concentrado — na prática usa-se ~10g por preparo,
-- não 100g. Mantido em "por 100g" pra bater com o padrão do resto da tabela;
-- o app já divide pela quantidade prescrita/registrada em gramas.

insert into foods (taco_id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sodium_per_100g)
values

-- ===== Embutidos (5 itens) =====
(90105, 'Presunto, peito de peru, fatiado', 'Carnes e derivados', 126, 17.5, 2, 4.8, 0, 1000),
(90106, 'Mortadela', 'Carnes e derivados', 269, 13.9, 3.4, 22.8, 0, 1150),
(90107, 'Salsicha, tipo hot dog', 'Carnes e derivados', 250, 13, 2, 21, 0, 900),
(90108, 'Linguiça, calabresa', 'Carnes e derivados', 289, 15.4, 0.8, 24.9, 0, 1100),
(90109, 'Nuggets de frango, empanado, assado', 'Carnes e derivados', 302, 18.5, 27.3, 12.8, 1.5, 580),

-- ===== Molhos e condimentos (5 itens) =====
(90110, 'Maionese, tradicional', 'Outros alimentos industrializados', 599, 0.8, 2.4, 66, 0, 600),
(90111, 'Ketchup', 'Outros alimentos industrializados', 102, 1.2, 23.2, 0.1, 0.3, 1070),
(90112, 'Mostarda, amarela', 'Outros alimentos industrializados', 66, 4, 5, 4, 1.5, 1050),
(90113, 'Molho de tomate, tradicional', 'Outros alimentos industrializados', 35, 1.2, 7, 0.2, 1.5, 400),
(90114, 'Caldo de galinha, tablete', 'Outros alimentos industrializados', 251, 6.3, 10.6, 20.4, 0, 14700),

-- ===== Salgadinhos (2 itens) =====
(90115, 'Batata, chips', 'Outros alimentos industrializados', 541, 5.4, 47.5, 35.8, 4, 624),
(90116, 'Salgadinho de milho, sabor queijo', 'Outros alimentos industrializados', 561, 5.8, 54.1, 35.8, 2.2, 896),

-- ===== Macarrão instantâneo (1 item) =====
(90117, 'Macarrão instantâneo, com tempero, cru', 'Cereais e derivados', 393, 7.2, 54, 16, 2.3, 1585),

-- ===== Bebidas (3 itens) =====
(90118, 'Refrigerante, cola', 'Bebidas (alcoólicas e não alcoólicas)', 42, 0, 10.6, 0, 0, 5),
(90119, 'Refrigerante, guaraná', 'Bebidas (alcoólicas e não alcoólicas)', 30, 0, 10, 0, 0, 5),
(90120, 'Suco de uva, néctar, caixinha', 'Bebidas (alcoólicas e não alcoólicas)', 41, 0, 10, 0, 0.1, 8),

-- ===== Cereal matinal (1 item) =====
(90121, 'Cereal matinal, flocos de milho, açucarado', 'Cereais e derivados', 375, 5, 83, 1, 1, 250)

on conflict (taco_id) do nothing;
