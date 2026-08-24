-- Clara de ovo mexida — pedido do Rafa: poder montar "ovos mexidos" com
-- ovo inteiro E clara na mesma refeição (ex: 2 inteiros + 3 claras).
--
-- O que a base já tinha e por que não bastava:
--   90001  Ovo, galinha, mexido, simples        (inteiro mexido)      ✓
--   486    Ovo, de galinha, clara, cozida/10min (clara COZIDA em água) ✗
--   487    Ovo, de galinha, gema, cozida/10min
--   488-90 Ovo inteiro cozido / cru / frito
--
-- Faltava a clara mexida. A clara cozida em água (486) não serve como
-- substituta: cozida na água ela concentra por perda de água e vai a
-- 13,45 g de proteína por 100 g, contra ~10,6 da mexida — usar uma pela
-- outra erraria a proteína em ~25% no valor por 100 g. E, pelo nome
-- "cozida/10minutos", quem digita "clara mexida" no FoodPicker não a acha.
--
-- FONTE: USDA FNDDS 32400080 — "Egg white omelet, scrambled, or fried,
-- no added fat". É literalmente o alimento pedido (clara mexida/omelete
-- de clara, sem gordura adicionada na cocção), não uma aproximação.
--   Por 100 g: 52 kcal · P 10,6 · C 2,4 · fibra 0 · G 0 · Na 281 mg
--
-- CONFERÊNCIA contra três referências independentes:
--   USDA 01124, clara CRUA:      52 kcal · P 11,0 · C 0,7 · G 0,2 · Na 166
--   Prospre, "scrambled egg whites": 59 kcal · P 12,3 · C 0,82 · G 0,18 · Na 514
--   TACO 486, clara cozida:      59,4 kcal · P 13,45 · C 0 · G 0,09 · Na 180
--
--   A energia bate exatamente com a clara crua (52 = 52) e a proteína fica
--   dentro de 4% dela — o esperado, já que mexer sem gordura não adiciona
--   nada, só evapora um pouco de água. As duas fontes mais "concentradas"
--   (Prospre e TACO) refletem preparos com mais perda de água.
--
--   Duas ressalvas honestas, porque o número vai pra dieta de gente:
--   • O C 2,4 g não é da clara pura (clara é ~0,7 g) — a receita de
--     referência do FNDDS leva um pouco de leite. Quem mexe clara pura sem
--     nada terá menos. Em 3 claras isso dá 2,4 g de carboidrato no total,
--     diferença sem efeito prático no plano.
--   • O sódio depende do sal de quem cozinha: as fontes vão de 166 a 514 mg.
--     Ficou o 281 do FNDDS, que é o valor do alimento cadastrado, e fica
--     no meio da faixa.
--
-- taco_id 90209 (o maior em uso era 90208). Insert idempotente.

insert into foods (taco_id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sodium_per_100g)
values
-- USDA FNDDS 32400080 — clara mexida/omelete de clara, sem gordura adicionada
(90209, 'Ovo, de galinha, clara, mexida', 'Ovos e derivados', 52, 10.6, 2.4, 0, 0, 281)
on conflict (taco_id) do nothing;

-- 1 clara = 33 g, o mesmo peso já usado na clara cozida (486) em
-- migration-peso-unidade.sql — ~2/3 de um ovo de 50 g. É também a porção
-- de referência da própria ficha do FNDDS. Assim o Rafa lança "3 claras"
-- em unidades, sem converter pra grama na mão.
update foods set unit_weight_g = 33 where taco_id = 90209;
