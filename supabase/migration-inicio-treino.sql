-- Data de início do contrato/treino do aluno — pra comemorar marcos de
-- tempo (1, 3, 6 meses, depois cada ano), igual ao aniversário de
-- nascimento já mostrado na agenda, só que contando a partir daqui.
-- Rode este arquivo inteiro no SQL Editor do Supabase.

alter table students add column if not exists training_start_date date;

NOTIFY pgrst, 'reload schema';
