-- Mural de mensagens: o personal publica recados pros alunos — pra todos,
-- só pros de personal, só pros de assessoria, ou pra um aluno específico.
-- Também recebe os avisos automáticos de "treino/dieta alterada" (botão
-- "Avisar aluno" nas edições), pra mudança ficar registrada e não se
-- perder na notificação.
--
-- Rode no SQL Editor do Supabase.

create table if not exists mural_posts (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references profiles(id) not null,
  -- público: todos os alunos do personal, um tipo de serviço, ou um aluno
  audience text not null default 'all'
    check (audience in ('all', 'personal', 'assessoria', 'student')),
  student_id uuid references students(id), -- só quando audience = 'student'
  -- tipo do recado: geral (escrito à mão), ou os automáticos de alteração
  kind text not null default 'geral' check (kind in ('geral', 'treino', 'dieta')),
  title text,
  body text not null,
  link_url text, -- blog, instagram, etc — vira botão "Abrir link" no post
  created_at timestamptz not null default now()
);

create index if not exists mural_posts_trainer_idx
  on mural_posts (trainer_id, created_at desc);

alter table mural_posts enable row level security;

-- personal: enxerga e gerencia só os próprios posts
drop policy if exists "mural_posts_trainer_all" on mural_posts;
create policy "mural_posts_trainer_all" on mural_posts for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- aluno: enxerga os posts do SEU personal que são pra ele — público geral,
-- do tipo de serviço dele, ou endereçado a ele
drop policy if exists "mural_posts_student_select" on mural_posts;
create policy "mural_posts_student_select" on mural_posts for select
  using (
    exists (
      select 1 from students s
      where s.profile_id = auth.uid()
        and s.trainer_id = mural_posts.trainer_id
        and (
          mural_posts.audience = 'all'
          or mural_posts.audience = s.service_type
          or (mural_posts.audience = 'student' and mural_posts.student_id = s.id)
        )
    )
  );

NOTIFY pgrst, 'reload schema';
