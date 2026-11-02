-- Dias da semana + horário fixo de treino do aluno, definidos direto no
-- editar aluno. Ao salvar, o app gera/atualiza automaticamente as aulas
-- recorrentes dele na agenda (training_sessions) — sem precisar criar uma
-- por uma na agenda manualmente.
-- training_schedule_group_id aponta pro recurrence_group_id das aulas
-- geradas por essa automação, pra saber quais substituir quando os dias ou
-- o horário mudam (sem tocar em aulas passadas ou já marcadas feita/falta).
-- Rode este arquivo inteiro no SQL Editor do Supabase.

alter table students add column if not exists training_weekdays int[];
alter table students add column if not exists training_time text;
alter table students add column if not exists training_schedule_group_id uuid;

NOTIFY pgrst, 'reload schema';
