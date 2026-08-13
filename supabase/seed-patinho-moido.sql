-- Carne bovina, patinho, moída, refogada/cozida — não existe na TACO
-- (só existe "patinho, sem gordura, cru/grelhado" e "acém, moído").
-- Valor cruzado entre 2 fontes independentes (aggregator de tabela
-- nutricional + guiadanutri.com, que cita o patinho como o corte mais
-- magro entre as opções de carne moída) — convergiram em ~170kcal e
-- ~27g de proteína por 100g; gordura de 6-7g bate com o cálculo reverso
-- (170 - 27*4 = 62kcal restantes / 9 = ~6.9g).
insert into foods (taco_id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sodium_per_100g) values (90104, 'Carne, bovina, patinho, moída, refogada', 'Carnes e derivados', 170, 27, 0, 6, 0, null) on conflict (taco_id) do nothing;
