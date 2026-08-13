-- Classificação do exercício por número de articulações envolvidas
-- (monoarticular/biarticular/multiarticular) — opcional, pra filtrar e
-- balancear o treino além do grupo muscular. Rode no SQL Editor do
-- Supabase.

alter table exercises add column if not exists joint_type text
  check (joint_type in ('monoarticular', 'biarticular', 'multiarticular'));
