-- Falta com ou sem direito a reposição: junto do motivo da falta, o Rafa
-- marca "Repor" (aluno avisou com antecedência / falta foi do personal) ou
-- "Sem reposição" (desmarcou em cima da hora / faltou sem avisar).
-- null = ainda não escolhido. Some junto quando a aula deixa de ser falta.
-- Rode este arquivo inteiro no SQL Editor do Supabase.

alter table training_sessions add column if not exists missed_makeup boolean;

NOTIFY pgrst, 'reload schema';
