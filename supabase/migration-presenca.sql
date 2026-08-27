-- Controle de presença nas aulas: além de 'done' (presente), o evento pode
-- virar 'missed' (falta). Botões Presente/Falta na tela do evento.
-- Rode este arquivo inteiro no SQL Editor do Supabase.

alter table training_sessions drop constraint if exists training_sessions_status_check;
alter table training_sessions add constraint training_sessions_status_check
  check (status in ('scheduled', 'canceled', 'done', 'missed'));
