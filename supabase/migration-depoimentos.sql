-- Depoimentos dos alunos (aba "Depoimento" no app do aluno, lista
-- "Depoimentos" no painel do personal). Veio da página avulsa de
-- depoimentos, agora dentro do app: o aluno logado envia, o personal recebe
-- push e vê tudo numa aba, com a autorização de uso registrada.
-- Rode no SQL Editor do Supabase.

create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references profiles(id) not null,
  student_id uuid references students(id) on delete cascade not null,
  display_name text not null,          -- como o aluno quer aparecer
  training_time text,                  -- "Menos de 3 meses", "De 1 a 2 anos"...
  rating int not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 20 and 600),
  authorized boolean not null default false, -- autoriza divulgar (site/redes)
  created_at timestamptz not null default now()
);

create index if not exists testimonials_trainer_idx
  on testimonials (trainer_id, created_at desc);

alter table testimonials enable row level security;

-- personal: vê e gerencia os depoimentos dos próprios alunos
drop policy if exists "testimonials_trainer_all" on testimonials;
create policy "testimonials_trainer_all" on testimonials for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- aluno: envia em nome próprio (student_id dele, trainer_id do personal dele)
-- e enxerga só os que ele mesmo mandou
drop policy if exists "testimonials_student_insert" on testimonials;
create policy "testimonials_student_insert" on testimonials for insert
  with check (
    exists (
      select 1 from students s
      where s.id = testimonials.student_id
        and s.profile_id = auth.uid()
        and s.trainer_id = testimonials.trainer_id
    )
  );

drop policy if exists "testimonials_student_select" on testimonials;
create policy "testimonials_student_select" on testimonials for select
  using (
    exists (
      select 1 from students s
      where s.id = testimonials.student_id and s.profile_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
