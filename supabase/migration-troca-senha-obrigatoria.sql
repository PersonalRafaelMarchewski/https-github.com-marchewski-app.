-- Troca de senha obrigatória no primeiro login.
--
-- Aluno criado pelo personal (ou pelo cadastro público) recebe uma senha
-- temporária de 8 caracteres que aparece na tela e vai por e-mail. Senha
-- que trafegou por e-mail tem que ser tratada como descartável: enquanto
-- must_change_password for true, o app manda o usuário pra /trocar-senha
-- antes de deixar usar qualquer tela.
--
-- Rode no SQL Editor do Supabase.

alter table profiles
  add column if not exists must_change_password boolean not null default false;

-- Quem já está usando o app não é incomodado: só as contas criadas daqui
-- pra frente nascem com a exigência (ver createStudent/submitStudentSignup,
-- que passam must_change_password: true no insert).

NOTIFY pgrst, 'reload schema';
