import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import ExerciseRow from "@/components/ExerciseRow";
import AddExerciseForm from "@/components/AddExerciseForm";

export default async function ExerciciosPage() {
  const supabase = await createClient();

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, video_url, instructions")
    .order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Biblioteca de exercícios</h1>

      <AddExerciseForm />

      {!exercises || exercises.length === 0 ? (
        <Card className="text-blue">Nenhum exercício cadastrado ainda.</Card>
      ) : (
        <div className="space-y-3">
          {exercises.map((ex) => (
            <ExerciseRow
              key={ex.id}
              id={ex.id}
              initialName={ex.name}
              initialMuscleGroup={ex.muscle_group}
              initialVideoUrl={ex.video_url}
              initialInstructions={ex.instructions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
