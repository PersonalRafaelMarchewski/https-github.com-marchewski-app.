-- Motivo da falta: texto livre opcional, preenchido junto com o botão
-- "Falta" da aula (ou depois, editando). Some sozinho quando a aula deixa
-- de ser falta (volta pra Presente ou desmarca).
-- Rode este arquivo inteiro no SQL Editor do Supabase.

alter table training_sessions add column if not exists missed_reason text;
