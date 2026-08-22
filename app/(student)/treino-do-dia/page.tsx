import { createClient, getAuthUser } from "@/lib/supabase/server";
import StudentCard from "@/components/student/StudentCard";
import FichaCarousel from "@/components/student/FichaCarousel";
import { loadTrainingData } from "@/lib/trainingData";

// A montagem dos dados (fichas + exercícios + alternativas + logs de hoje)
// vive em lib/trainingData.ts, compartilhada com o "modo treino" do
// personal (app/(trainer)/alunos/[id]/treinar) — as duas telas mostram a
// mesma ficha e precisam montar os dados do mesmo jeito.
export default async function TreinoDoDiaPage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  if (!student) {
    return <StudentCard className="text-blue">Nenhum treino vinculado à sua conta ainda.</StudentCard>;
  }

  const data = await loadTrainingData(supabase, student.id);

  if (data.status === "no-workouts") {
    return <StudentCard className="text-blue">Nenhum treino ativo no momento.</StudentCard>;
  }
  if (data.status === "no-exercises") {
    return <StudentCard className="text-blue">Nenhum exercício cadastrado ainda.</StudentCard>;
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-navy">Fichas de treinamento</h1>
      <p className="mb-5 text-blue">
        {data.sessions.length > 1 ? "Arraste pros lados pra trocar de ficha." : "Sua ficha de hoje."}
      </p>

      <FichaCarousel
        sessions={data.sessions}
        logByExercise={data.logByExercise as any}
        studentId={student.id}
        today={data.today}
        initialIndex={data.initialIndex}
        lastDoneBySession={data.lastDoneBySession}
      />
    </div>
  );
}
