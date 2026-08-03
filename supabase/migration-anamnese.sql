-- Adiciona a anamnese digital do aluno. Rode no SQL Editor do Supabase.

alter table students add column if not exists anamnesis jsonb;

-- aluno pode atualizar a própria linha (usado pra salvar a anamnese)
drop policy if exists "students_update_self" on students;
create policy "students_update_self" on students for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
