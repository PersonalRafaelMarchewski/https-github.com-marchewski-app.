-- Duas melhorias no resumo de treino do aluno:
--
-- 1. Tempo editável: os minutos do card "Treino concluído" são calculados
--    do primeiro ao último exercício marcado — erra quando o aluno marca
--    tudo de uma vez no fim (2 min) ou deixa o app aberto (3h). O aluno
--    agora pode corrigir, e o valor corrigido fica salvo na sessão.
--
-- 2. Carga por lado: em exercícios com halteres, máquinas articuladas e
--    unilaterais, a carga anotada é POR LADO (remada articulada 25kg =
--    25 de cada lado = 50 movidos). O flag marca esses exercícios e os
--    totais de "kg movidos" passam a dobrar a contribuição deles. A
--    evolução de carga e os recordes continuam mostrando o valor anotado
--    (25), senão a comparação com o histórico quebrava.
--
-- Rode no SQL Editor do Supabase.

alter table workout_sessions add column if not exists duration_minutes int;

alter table exercises add column if not exists bilateral_load boolean not null default false;

-- marca de uma vez os exercícios da biblioteca cujo nome já diz que a
-- carga é por lado — o personal pode corrigir qualquer um pelo checkbox
-- novo na biblioteca (ExerciseRow/AddExerciseForm)
update exercises
  set bilateral_load = true
  where name ~* '(halter|unilateral|articulad)';

NOTIFY pgrst, 'reload schema';
