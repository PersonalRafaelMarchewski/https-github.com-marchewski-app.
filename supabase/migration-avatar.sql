-- Foto de perfil (avatar) do aluno. Rode no SQL Editor do Supabase.
-- A coluna profiles.avatar_url já existe desde o schema original — aqui
-- ela passa a guardar o caminho no storage (não uma URL pública), igual
-- ao padrão usado pelas fotos de avaliação e vídeos de exercício.

-- Bucket privado — todo acesso passa pelo servidor com a service_role key.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;
