-- Permite "arquivar" um exercício de uma ficha ativa (some da ficha pro
-- aluno — treinar agora, plano semanal — mas o histórico já registrado
-- continua intacto e corretamente atribuído, já que a linha não é
-- apagada). Antes disso, excluir um exercício com histórico falhava
-- (FK de workout_logs.workout_exercise_id) e não havia alternativa.
-- Rode no SQL Editor do Supabase.

alter table workout_exercises add column if not exists active boolean not null default true;
