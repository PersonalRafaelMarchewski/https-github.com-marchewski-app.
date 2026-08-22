import Link from "next/link";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import FichaCarousel from "@/components/student/FichaCarousel";
import { loadTrainingData } from "@/lib/trainingData";
import { finishWorkoutAsTrainer } from "./actions";

// Modo treino: o personal roda o treino do aluno no próprio celular,
// durante a aula presencial — a MESMA ficha que o aluno veria (mesmos
// componentes, mesma montagem de dados via lib/trainingData.ts), sem
// nenhuma opção de edição. Anota carga/reps por série, marca exercício
// feito, troca por alternativa e conclui — tudo entra no histórico do
// aluno igualzinho a se ele mesmo tivesse registrado. Diferenças de
// propósito: concluir não manda push (foi o personal que rodou) e não tem
// gravação de vídeo (isso é feedback à distância).
export default async function TreinarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // a RLS só devolve aluno da carteira de quem pergunta
  const { data: student } = await supabase
    .from("students")
    .select("id, profiles:profile_id (name)")
    .eq("id", id)
    .single();

  if (!student) {
    return <Card className="text-blue">Aluno não encontrado.</Card>;
  }

  const studentName = (student as any).profiles?.name ?? "Aluno";
  const data = await loadTrainingData(supabase, student.id);

  const backLink = (
    <Link
      href={`/alunos/${id}`}
      className="flex items-center gap-1.5 text-sm text-blue hover:underline"
    >
      <ArrowLeft size={16} />
      Voltar pro aluno
    </Link>
  );

  if (data.status !== "ok") {
    return (
      <div className="space-y-4">
        {backLink}
        <Card className="text-blue">
          {data.status === "no-workouts"
            ? `${studentName} não tem nenhum treino ativo no momento.`
            : `${studentName} não tem exercícios cadastrados ainda.`}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-4">{backLink}</div>

      <div className="mb-1 flex items-center gap-2">
        <Dumbbell size={22} className="flex-none text-orange" />
        <h1 className="text-2xl font-bold text-navy">Treinando com {studentName}</h1>
      </div>
      <p className="mb-5 text-blue">
        Anote as cargas e conclua — entra no histórico do aluno como se ele mesmo
        tivesse registrado.
      </p>

      <FichaCarousel
        sessions={data.sessions}
        logByExercise={data.logByExercise as any}
        studentId={student.id}
        today={data.today}
        initialIndex={data.initialIndex}
        lastDoneBySession={data.lastDoneBySession}
        trainerMode
        finishAction={finishWorkoutAsTrainer.bind(null, student.id)}
        afterFinishUrl={`/alunos/${id}`}
      />
    </div>
  );
}
