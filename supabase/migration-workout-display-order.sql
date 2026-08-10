-- Ordem de exibição manual dos treinos na página do aluno (em vez de tirar
-- pela sigla A/B/C, que está sendo removida da interface). Rode no SQL
-- Editor do Supabase.

alter table workouts add column if not exists display_order integer;

-- Ordem manual dos blocos dentro de um treino (Treino A/B/C vira só um nome
-- escolhido pelo personal, mas a ordem de exibição dos blocos continua
-- precisando de algo pra ordenar por — antes era a letra).
alter table workout_labels add column if not exists order_index integer;
