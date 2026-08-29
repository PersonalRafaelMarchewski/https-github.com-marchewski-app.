-- Laudo de bioimpedância anexado à avaliação física (PDF ou imagem).
-- O arquivo fica no mesmo bucket privado das fotos ('evaluation-photos',
-- já criado pela migration-evaluation-photos.sql); aqui só o caminho.
-- Rode este arquivo inteiro no SQL Editor do Supabase.

alter table evaluations add column if not exists bioimpedance_path text;
