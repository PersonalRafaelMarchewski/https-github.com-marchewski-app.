-- Repetições por série (junto com a carga por série que já existe) —
-- facilita calcular a kilagem de verdade (carga x repetições, não só a
-- carga). Rode no SQL Editor do Supabase, e depois rode também:
-- NOTIFY pgrst, 'reload schema';
-- (senão a API pode não reconhecer a coluna nova na hora — já aconteceu
-- antes com o exercício alternativo).

alter table workout_logs add column if not exists actual_reps jsonb;

NOTIFY pgrst, 'reload schema';
