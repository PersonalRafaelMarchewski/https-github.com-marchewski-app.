-- Produtos de marca (industrializados/embalados) que a TACO não cobre —
-- puxados do Open Food Facts (openfoodfacts.org, banco aberto sob
-- licença ODbL, dado comunitário). Rode DEPOIS da TACO já estar
-- carregada.
--
-- Excluí 2 itens da amostra original por valor implausível que não
-- consegui confirmar contra o rótulo oficial da marca: "TriMais Pão
-- Integral 40%" (23g de gordura/100g — bem fora do normal pra pão) e
-- "Linea Barra de Proteína Chocolate" (0g de gordura numa barra com
-- cobertura de chocolate — improvável). Se quiser esses dois, primeiro
-- preciso confirmar no site/rótulo da marca antes de subir.

insert into foods (taco_id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sodium_per_100g)
values

-- ===== Pães de forma (19 itens) =====
(90024, 'Pão de forma, premium, Panco', 'Cereais e derivados', 252, 8.4, 50, 2.6, 3.2, 380),
(90025, 'Pão de forma, tradicional, Pullman', 'Cereais e derivados', 244, 7.6, 48, 2.6, 2.6, 380),
(90026, 'Pão de forma, integral 36% cereais, Visconti', 'Cereais e derivados', 269, 8.7, 49, 4.2, 4.0, 400),
(90027, 'Pão de forma, Pan, Bauducco', 'Cereais e derivados', 276, 9.0, 50, 4.4, 2.6, 450),
(90028, 'Pão de forma, tradicional, Visconti', 'Cereais e derivados', 275, 9.0, 50, 4.3, 2.5, 470),
(90029, 'Pão de forma, sanduíche, Marilan', 'Cereais e derivados', 390, 8.4, 52, 2.4, 2.4, 330),
(90030, 'Pão de forma, Pan integral, Bauducco', 'Cereais e derivados', 254, 9.7, 45, 3.9, 5.5, 380),
(90031, 'Pão de forma, integral tradicional, Wickbold', 'Cereais e derivados', 246, 14.2, 40, 3.2, null, null),
(90032, 'Pão de forma, fermentação natural multigrãos, Bauducco', 'Cereais e derivados', 256, 12.0, 42, 4.4, 8.5, 540),
(90033, 'Pão de forma, tradicional, PlusVita', 'Cereais e derivados', 250, 8.8, 48, 2.6, 2.6, 380),
(90034, 'Pão de forma, Kim', 'Cereais e derivados', 274, 9.4, 50, 4.0, 2.2, 310),
(90035, 'Pão de forma, benefice light, Seven Boys', 'Cereais e derivados', 234, 13.6, 38, 3.0, 5.8, 190),
(90036, 'Pão de forma, 5 zeros, Wickbold', 'Cereais e derivados', 238, 11.2, 46, 1.0, 4.2, 340),
(90037, 'Pão de forma, multigrano proteína, Castaño', 'Cereais e derivados', 262, 16.0, 39, 4.4, 6.5, 380),
(90038, 'Pão de forma, sem açúcares 12 grãos, Plusvita', 'Cereais e derivados', 119, 7.1, 18, 2.1, 4.1, 160),
(90039, 'Pão de forma, tradicional (500g), Wickbold', 'Cereais e derivados', 228, 9.0, 50, 1.8, 2.4, 370),
(90040, 'Pão de forma, tradicional sem glúten, Jasmine', 'Cereais e derivados', 266, 2.2, 54, 4.6, 2.0, 400),
(90041, 'Pão de forma, integral com castanha e quinoa, Caseirinho', 'Cereais e derivados', 286, 11.0, 48, 5.5, 3.3, 400),
(90042, 'Pão de forma, integral, Rei do Pão', 'Cereais e derivados', 265, 8.8, 56, 1.5, 14.7, 590),

-- ===== Barras de proteína (12 itens) =====
(90043, 'Barra de proteína, trufa de chocolate, Bold', 'Suplementos', 375, 35, 30, 14.8, 6, 255),
(90044, 'Barra de proteína, chocolate, YoPro', 'Suplementos', 416, 27.3, 27.3, 20, null, null),
(90045, 'Barra de proteína, banoffee, Banana Brasil', 'Suplementos', 362, 32, 32, 15, 10.6, 134),
(90046, 'Barra de proteína, torta de limão, Banana Brasil', 'Suplementos', 360, 32, 32, 15, 10.6, 136),
(90047, 'Barra de proteína, caramelo, Wild Protein', 'Suplementos', 384, 33.4, 37.8, 11.2, null, 242),
(90048, 'Barra de proteína, brownie, Atlhetica', 'Suplementos', 344, 31.3, 24.7, 16.9, 15, 84),
(90049, 'Barra de proteína, vegana, Nutsbar', 'Suplementos', 448, 20, 39.2, 26, 10.4, null),
(90050, 'Barra de proteína, coco e cobertura, Banana Brasil', 'Suplementos', 339, 33, 39, 9.1, 8.2, 256),
(90051, 'Barra de proteína, match, Nutrata', 'Suplementos', 340, 30, 27.5, 17, 5.5, null),
(90052, 'Barra de proteína, chocolate belga e caramelo, Dux Nutrition Lab', 'Suplementos', 390, 30, 45, 12.8, 20, null),
(90053, 'Barra de proteína, paçoca, Taeq', 'Suplementos', 380, 17.5, 45, 20.5, 7.8, null),
(90054, 'Barra de proteína, torta de limão (linha Bold), Bold', 'Suplementos', 342, 33.3, 26.7, 15, 8.3, 117),

-- ===== Iogurte de marca (11 itens) =====
(90055, 'Iogurte, natural, integral, Itambé', 'Leite e derivados', 75.5, 4.1, 6, 3.9, null, 47),
(90056, 'Iogurte, natural, integral, Nestlé', 'Leite e derivados', 69, 4.1, 4, 4.1, null, 74),
(90057, 'Iogurte, natural, integral, Danone', 'Leite e derivados', 75.6, 4.7, 6.3, 3.6, null, 54),
(90058, 'Iogurte, natural, desnatado, Nestlé', 'Leite e derivados', 31.3, 3.6, 4.1, 0, null, 49),
(90059, 'Iogurte, natural, desnatado, Danone', 'Leite e derivados', 52.5, 5.6, 7.5, 0, null, 64),
(90060, 'Iogurte, natural, integral (170g), Itambé', 'Leite e derivados', 73.5, 4.5, 5.9, 3.5, null, 66),
(90061, 'Iogurte, natural, parcialmente desnatado, Vigor', 'Leite e derivados', 60, 4, 6.1, 2.1, null, 63),
(90062, 'Iogurte, natural, integral, Batavo', 'Leite e derivados', 60, 3.6, 4.7, 3, null, 56),
(90063, 'Iogurte, natural, integral, Serramar', 'Leite e derivados', 64.7, 3.9, 5.5, 3, null, 51),
(90064, 'Iogurte, whey, cookies & cream, Verde Campo', 'Leite e derivados', 50, 5.6, 6, 0.4, null, null),
(90065, 'Iogurte, whey, morango, Verde Campo', 'Leite e derivados', 46, 5.6, 5.9, 0, null, 29),

-- ===== Granola de marca (2 itens) =====
(90066, 'Granola, tradicional, zero açúcar, Mãe Terra', 'Cereais e derivados', 402.5, 11.75, 42.5, 20, 10, 10),
(90067, 'Granola, crocante', 'Cereais e derivados', 367.5, 10, 67.5, 5, 7.5, 0)

on conflict (taco_id) do nothing;
