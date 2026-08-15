-- Fecha as lacunas da base contra a POF 2017-2018 do IBGE (aquisição
-- alimentar domiciliar per capita, tabela 2393 do SIDRA — o dado público mais
-- próximo de "o que o brasileiro mais compra").
--
-- Dos 254 produtos reais da POF, 231 já estavam na base. Estes 13 fecham o que
-- faltava e tinha composição confiável. Depois deles a cobertura da POF fica
-- em 96,1% (244 de 254).
--
-- FICARAM DE FORA, de propósito, 9 itens sem composição publicada nem na TBCA
-- nem no USDA: massa de pizza (só existe pizza pronta de marca) e 8 peixes
-- regionais amazônicos (jaraqui, mapará, traíra, acari, anujá, piau, acará,
-- parati), que somados dão 0,19 kg/pessoa/ano no país. Melhor não ter o
-- alimento do que ter com número inventado.
--
-- "Curimatã" da POF também não entrou: é o mesmo peixe do "Corimba, cru"
-- (taco_id 288) que a TACO já traz — só muda o nome regional.
--
-- FONTES (por item, na coluna de comentário). TBCA = Tabela Brasileira de
-- Composição de Alimentos (USP/FoRC); USDA = FoodData Central (domínio
-- público). Onde as duas tinham o item, os valores foram conferidos entre si.
--
-- taco_id a partir de 90193 (o maior em uso era 90192). Insert idempotente.

insert into foods (taco_id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sodium_per_100g)
values
-- Bebidas — item nº 1 em aquisição no Brasil inteiro (25,9 kg/pessoa/ano).
-- Sódio varia com a marca/fonte da água; 1 mg/100 ml é a ordem de grandeza
-- típica das minerais brasileiras.
(90193, 'Água mineral', 'Bebidas (alcoólicas e não alcoólicas)', 0, 0, 0, 0, 0, 1),

-- Cereais e derivados — USDA (sweet rolls, cinnamon, commercially prepared)
(90194, 'Rosca, doce', 'Cereais e derivados', 372, 6.2, 50.9, 16.4, 2.4, 304),

-- Carnes e derivados
-- miúdos: USDA (chicken, broilers or fryers, giblets, raw) — é a mistura;
-- coração e fígado de frango já existem separados (taco_id 394 e 400)
(90195, 'Frango, miúdos, crus', 'Carnes e derivados', 124, 17.9, 1.8, 4.47, 0, 77),
-- pato: TBCA (carne, pato, s/ pele, cru)
(90196, 'Pato, sem pele, cru', 'Carnes e derivados', 130, 18.3, 0.89, 5.95, 0, 74),
-- paio: USDA (sausage, smoked link sausage, pork) — aproximação, não há
-- composição publicada do paio brasileiro; o perfil é o de linguiça suína
-- defumada. Conferir contra rótulo se for prescrever com precisão.
(90197, 'Paio', 'Carnes e derivados', 309, 12, 0.94, 28.2, 0, 827),

-- Produtos açucarados
-- sorvete: TBCA (industrializado); conferido com USDA (ice creams, vanilla):
-- 207 kcal / P 3,5 / C 23,6 / G 11 — mesma ordem
(90198, 'Sorvete, industrializado', 'Produtos açucarados', 210, 3.5, 26.6, 10.1, 0.93, 60),
-- bombom: TBCA (bombom, chocolate ao leite)
(90199, 'Bombom, chocolate ao leite', 'Produtos açucarados', 548, 6.15, 60.9, 31.5, 1.92, 77.5),

-- Gorduras e óleos — TBCA (banha, suína); conferido com USDA (lard): 902 kcal
-- e 100 g de gordura. Não confundir com "Toucinho, cru" (taco_id 444), que é
-- o corte, não a gordura derretida.
(90200, 'Banha, suína', 'Gorduras e óleos', 900, 0, 0, 100, 0, 0),

-- Miscelâneas — TBCA (colorífico, urucum, corante colorau, em pó)
(90201, 'Colorau (colorífico/urucum), em pó', 'Miscelâneas', 318, 8.67, 73, 6.14, 32.1, 12.3),

-- Pescados e frutos do mar
(90202, 'Tambaqui, cru', 'Pescados e frutos do mar', 140, 19.9, 0, 6.67, 0, 56.7),        -- TBCA
(90203, 'Tainha, filé, cru', 'Pescados e frutos do mar', 150, 25.2, 0, 5.5, 0, 48.6),     -- TBCA
(90204, 'Bagre, cru', 'Pescados e frutos do mar', 119, 15.2, 0, 5.94, 0, 98),             -- USDA (catfish, channel, farmed)
(90205, 'Anchova, filé, fresca', 'Pescados e frutos do mar', 179, 16.8, 0, 12.4, 0, 119)  -- TBCA

on conflict (taco_id) do nothing;
