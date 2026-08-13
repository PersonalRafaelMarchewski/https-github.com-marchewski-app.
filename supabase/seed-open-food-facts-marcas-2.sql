-- Segunda leva de produtos de marca (Open Food Facts) — pasta de
-- amendoim, atum enlatado, requeijão, leite de aveia, achocolatado.
-- Rode DEPOIS da primeira leva (seed-open-food-facts-marcas.sql).
--
-- Excluí 2 achocolatados da amostra original por valor implausível:
-- "Choco Family, Vitafor" (175g de carboidrato em 100g — impossível) e
-- "Aptiva" (37 kcal/100g — bem abaixo do normal pra um pó).

insert into foods (taco_id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sodium_per_100g)
values

-- ===== Pasta de amendoim (12 itens) =====
(90068, 'Pasta de amendoim, zero açúcar, Amendo Power, DaColônia', 'Leguminosas e derivados', 607, 29.3, 7.3, 50.7, 7.3, 0),
(90069, 'Pasta de amendoim, integral, Power1One', 'Leguminosas e derivados', 587, 27.3, 20, 44, 8, 0.9),
(90070, 'Pasta de amendoim, integral, com cacau, Guimarães', 'Leguminosas e derivados', 622, 25, 15, 51, 8.2, 1.7),
(90071, 'Pasta de amendoim, integral, Da Nona', 'Leguminosas e derivados', 544, 27, 20, 44, 8, 1.8),
(90072, 'Pasta de amendoim, com whey, Santo Antônio', 'Leguminosas e derivados', 567, 33.3, 20, 41, 7.3, 10.7),
(90073, 'Pasta de amendoim, crocante, integral, Guimarães', 'Leguminosas e derivados', 611, 27, 16, 49, 8.5, 0),
(90074, 'Pasta de amendoim, tradicional, Qualitá', 'Leguminosas e derivados', 607, 29.3, 7.3, 51.3, 7.3, 0),
(90075, 'Pasta de amendoim, the cookies, Casa de Mãe', 'Leguminosas e derivados', 580, 24, 22, 44, 6.2, 0),
(90076, 'Pasta de amendoim, integral granulado, Mandubim', 'Leguminosas e derivados', 620, 25.3, 10.7, 52.7, 7.3, 0),
(90077, 'Pasta de amendoim, integral, crocante, Power1One', 'Leguminosas e derivados', 587, 27.3, 20, 44, 8, 0.9),
(90078, 'Pasta de amendoim, integral, Mandubim', 'Leguminosas e derivados', 620, 25.3, 10.7, 52.7, 7.3, 0),
(90079, 'Pasta de amendoim, sabor chocolate com avelã, Power One', 'Leguminosas e derivados', 500, 22.7, 28.7, 38, null, null),

-- ===== Atum enlatado (10 itens) =====
(90080, 'Atum, ralado, ao natural, Gomes da Costa', 'Pescados e frutos do mar', 94, 21, 0, 1.3, 0, 579),
(90081, 'Atum, sólido, ao natural, Gomes da Costa', 'Pescados e frutos do mar', 135, 28, 0, 2.7, 0, 556),
(90082, 'Atum, em pedaços, ao natural, Gomes da Costa', 'Pescados e frutos do mar', 91, 20, 0, 1.1, 0, 147),
(90083, 'Atum, em pedaços, em óleo, Gomes da Costa', 'Pescados e frutos do mar', 154, 24.2, 0, 6.3, 0, 585),
(90084, 'Atum, ralado, em óleo, Gomes da Costa', 'Pescados e frutos do mar', 160, 16.7, 0, 10.3, 0, 397),
(90085, 'Atum, sólido, ao natural, Coqueiro', 'Pescados e frutos do mar', 118, 26.7, 0, 1.1, 0, 486),
(90086, 'Atum, ralado, em molho com tomate, Coqueiro', 'Pescados e frutos do mar', 184, 15, 3.4, 11.7, 1.4, 463),
(90087, 'Atum, em lata, Pescador', 'Pescados e frutos do mar', 118, 27.6, null, 1.1, null, null),
(90088, 'Atum, ralado, ao natural, Camil Pescador', 'Pescados e frutos do mar', 103, 19.1, 0, 3.1, 0, 495),
(90089, 'Atum, ralado, em óleo, defumado, Gomes da Costa', 'Pescados e frutos do mar', 167, 16.7, 0, 10.8, 0, null),

-- ===== Requeijão (5 itens) =====
(90090, 'Requeijão, light, Tirol', 'Leite e derivados', 177, 11, 3.3, 13.3, 0, 560),
(90091, 'Requeijão, cremoso, tradicional, Elegê', 'Leite e derivados', 237, 7, 1.7, 23, 0, 540),
(90092, 'Requeijão, cremoso, light, Danúbio', 'Leite e derivados', 147, 11.7, 4, 9.3, 0, 520),
(90093, 'Requeijão, cremoso, sem lactose, Tirolez', 'Leite e derivados', 273, 7, 0.3, 27, 0, 500),
(90094, 'Requeijão, cremoso com amido, light, Vale do Pardo', 'Leite e derivados', 123, 2, 6.7, 10, 0, 0),

-- ===== Leite de aveia (2 itens) =====
(90095, 'Leite de aveia, orgânico, Nude', 'Leite e derivados', 41, 1.65, 7, 0.8, 0.45, 16),
(90096, 'Leite de aveia, zero lactose, Natural One', 'Leite e derivados', 51, 0.8, 10, 0.85, 0, 16.5),

-- ===== Achocolatado em pó (7 itens) =====
(90097, 'Achocolatado, em pó, Nescau, Nestlé', 'Leite e derivados', 380, 3.0, 85, 2.0, 4.5, 50),
(90098, 'Achocolatado, em pó, Power, Apti Alimentos', 'Leite e derivados', 380, 2.5, 85, 2.0, 4.0, 5),
(90099, 'Achocolatado, em pó, vitaminado, ChocoKI, Essential Nutrition', 'Leite e derivados', 160, 8.0, 64.7, 4.7, 10.7, 0),
(90100, 'Achocolatado, em pó, diet, Gold', 'Leite e derivados', 344, 8.9, 64.4, 5.6, 11.1, 0),
(90101, 'Achocolatado, em pó, tradicional, Lowçucar', 'Leite e derivados', 350, 4.5, 80, 2.5, 7.5, 0),
(90102, 'Achocolatado, em pó, proteico com whey, +MU', 'Leite e derivados', 347, 26.7, 44.7, 6.7, 18.7, 0),
(90103, 'Achocolatado, em pó, gourmet, 32% cacau, Santa Mônica', 'Leite e derivados', 333, 0, 73.3, 3.3, 7.3, 0)

on conflict (taco_id) do nothing;
