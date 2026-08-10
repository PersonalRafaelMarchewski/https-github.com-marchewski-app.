-- Carga usada série por série (ex: 20kg, 22kg, 23kg numa progressão dentro
-- do mesmo exercício), em vez de um valor único pra todas as séries. Rode
-- no SQL Editor do Supabase.

alter table workout_logs add column if not exists actual_loads jsonb;

-- actual_load (coluna já existente) continua sendo preenchida com a maior
-- carga entre as séries — é o que os gráficos de evolução já usam, então
-- continuam funcionando sem mudar nada.
