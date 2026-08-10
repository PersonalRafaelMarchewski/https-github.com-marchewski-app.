import { createClient } from "@/lib/supabase/server";
import ExerciseLibraryList from "@/components/ExerciseLibraryList";
import AddExerciseForm from "@/components/AddExerciseForm";

export default async function ExerciciosPage() {
  const supabase = await createClient();

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, video_url, instructions")
    .order("name");

  // tabela nova (exercício alternativo) — tolera não existir ainda, fica
  // sem alternativa nenhuma cadastrada até a migração rodar
  const { data: alternativeRows } = await supabase
    .from("exercise_alternatives")
    .select("exercise_id, alternative_exercise_id");

  const alternativesByExercise: Record<string, string[]> = {};
  for (const row of alternativeRows ?? []) {
    (alternativesByExercise[row.exercise_id] ??= []).push(row.alternative_exercise_id);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Biblioteca de exercícios</h1>

      <AddExerciseForm />

      <ExerciseLibraryList exercises={exercises ?? []} alternativesByExercise={alternativesByExercise} />
    </div>
  );
}
