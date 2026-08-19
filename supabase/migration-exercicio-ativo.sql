-- Ativar/desativar exercício: em vez de apagar um exercício duplicado ou
-- que não usa mais (o que pode falhar se ele estiver prescrito em alguma
-- ficha), o personal pode desativar — ele some do seletor ao montar treino
-- novo, mas continua existindo pra quem já tem ele prescrito e no
-- histórico. Rode no SQL Editor do Supabase.

alter table exercises add column if not exists active boolean not null default true;

NOTIFY pgrst, 'reload schema';
