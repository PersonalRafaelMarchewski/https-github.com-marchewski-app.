-- Foto do exercício — alternativa ao vídeo quando não dá pra gravar (ex:
-- aparelho específico da academia do aluno). Mesmo padrão do vídeo de
-- demonstração da biblioteca: bucket público, o campo image_url guarda o
-- link direto depois do upload. Rode no SQL Editor do Supabase.

alter table exercises add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('exercise-library-photos', 'exercise-library-photos', true)
on conflict (id) do nothing;

NOTIFY pgrst, 'reload schema';
