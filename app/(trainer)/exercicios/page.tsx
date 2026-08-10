import { createClient } from "@/lib/supabase/server";
import ExerciseLibraryList from "@/components/ExerciseLibraryList";
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

      <ExerciseLibraryList exercises={exercises ?? []} />
    </div>
  );
}
