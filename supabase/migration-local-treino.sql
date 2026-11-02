-- Local onde o aluno treina (ex: "Academia Bio Ritmo - Moema", "Casa do
-- aluno", "Studio X") — anotação livre, útil principalmente pros alunos de
-- personal, onde o treinador se desloca entre endereços diferentes.
-- Rode este arquivo inteiro no SQL Editor do Supabase.

alter table students add column if not exists training_location text;

NOTIFY pgrst, 'reload schema';
