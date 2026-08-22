-- Modo treino: o personal roda o treino do aluno no próprio celular.
--
-- Caso de uso real: aula de personal presencial — o Rafa abre o app DELE,
-- entra no "modo treino" do aluno (/alunos/[id]/treinar), anota as cargas
-- e finaliza a sessão. O aluno não precisa nem abrir o app, e o histórico
-- dele fica idêntico a se ele mesmo tivesse registrado (evolução de carga,
-- barra do programa, calendário — tudo alimentado igual).
--
-- Até aqui a regra era "aluno registra o próprio progresso; o personal só
-- lê" (schema.sql). Estas policies ADICIONAM a permissão do personal
-- registrar PELOS PRÓPRIOS alunos — as policies existentes do aluno
-- continuam valendo (policies de um mesmo comando são somadas com OR).
-- Um personal continua sem conseguir tocar em aluno de outro personal.
--
-- Rode no SQL Editor do Supabase.

-- workout_logs: o personal insere registro de exercício pros seus alunos
-- (update do personal já existia — "workout_logs_update_trainer" — pra
-- salvar a nota/comentário dele nos registros do aluno)
drop policy if exists "workout_logs_insert_trainer" on workout_logs;
create policy "workout_logs_insert_trainer" on workout_logs for insert
  with check (student_id in (select id from students where trainer_id = auth.uid()));

-- workout_sessions: o personal registra a sessão concluída do dia
-- (o select do personal já existia na criação da tabela)
drop policy if exists "workout_sessions_insert_trainer" on workout_sessions;
create policy "workout_sessions_insert_trainer" on workout_sessions for insert
  with check (student_id in (select id from students where trainer_id = auth.uid()));

drop policy if exists "workout_sessions_update_trainer" on workout_sessions;
create policy "workout_sessions_update_trainer" on workout_sessions for update
  using (student_id in (select id from students where trainer_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
