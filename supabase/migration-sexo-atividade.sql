-- Sexo biológico e nível de atividade física do aluno — usados pra
-- calcular o gasto calórico (fórmula de Mifflin-St Jeor) na hora de
-- montar a meta da dieta. Ambos opcionais (aluno já cadastrado antes
-- continua funcionando normal, só sem o cálculo automático até
-- preencher). Rode no SQL Editor do Supabase.

alter table students add column if not exists sex text check (sex in ('M', 'F'));

alter table students add column if not exists activity_level text
  check (activity_level in ('sedentario', 'leve', 'moderado', 'intenso', 'muito_intenso'));

NOTIFY pgrst, 'reload schema';
