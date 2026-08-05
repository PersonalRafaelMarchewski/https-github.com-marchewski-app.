-- Feedback de execução: aluno anexa um vídeo do set, personal responde
-- com nota de técnica + comentário. Rode no SQL Editor do Supabase.

alter table workout_logs
  add column if not exists video_path text,
  add column if not exists trainer_feedback_text text,
  add column if not exists trainer_rating int;

alter table workout_logs
  drop constraint if exists workout_logs_trainer_rating_check;

alter table workout_logs
  add constraint workout_logs_trainer_rating_check
  check (trainer_rating between 1 and 5);

-- o personal também precisa poder atualizar o log do aluno (pra salvar a
-- própria nota/comentário) — antes só o próprio aluno tinha essa permissão
drop policy if exists "workout_logs_update_trainer" on workout_logs;
create policy "workout_logs_update_trainer" on workout_logs for update
  using (student_id in (select id from students where trainer_id = auth.uid()));

-- Bucket privado — o upload usa signed URL gerada pelo servidor
-- (service_role), então não precisa de policies de storage aqui.
insert into storage.buckets (id, name, public)
values ('exercise-videos', 'exercise-videos', false)
on conflict (id) do nothing;
