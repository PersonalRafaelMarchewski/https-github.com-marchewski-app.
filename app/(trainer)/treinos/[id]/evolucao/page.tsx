import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import ProgressChart from "@/components/ProgressChart";

export default async function EvolucaoCargaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, name, student_id, students:student_id (profiles:profile_id (name))")
    .eq("id", id)
    .single();

  if (!workout) {
    return <Card className="text-blue">Treino não encontrado.</Card>;
  }

  const { data: workoutExercises } = await supabase
    .from("workout_exercises")
    .select("id, label, sets, load, order_index, exercises:exercise_id (name)")
    .eq("workout_id", id)
    .order("label")
    .order("order_index");

  const weIds = (workoutExercises ?? []).map((we) => we.id);

  const { data: logs } = weIds.length
    ? await supabase
        .from("workout_logs")
        .select("workout_exercise_id, date, actual_load")
        .in("workout_exercise_id", weIds)
        .not("actual_load", "is", null)
        .order("date", { ascending: true })
    : { data: [] as { workout_exercise_id: string; date: string; actual_load: number }[] };

  const logsByExercise = new Map<string, { date: string; value: number }[]>();
  for (const log of logs ?? []) {
    const list = logsByExercise.get(log.workout_exercise_id) ?? [];
    list.push({ date: log.date, value: Number(log.actual_load) });
    logsByExercise.set(log.workout_exercise_id, list);
  }

  const studentName = (workout as any).students?.profiles?.name ?? "Aluno";
  const withData = (workoutExercises ?? []).filter(
    (we) => (logsByExercise.get(we.id)?.length ?? 0) > 0
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/alunos/${workout.student_id}`}
          className="mb-2 flex items-center gap-1.5 text-sm text-blue hover:underline"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <h1 className="text-2xl font-bold text-navy">Evolução de carga</h1>
        <p className="text-blue">
          {workout.name} · {studentName}
        </p>
      </div>

      {withData.length === 0 ? (
        <Card className="text-blue">
          Nenhuma carga registrada pelo aluno ainda nesse treino. A carga real aparece aqui
          conforme o aluno for marcando exercícios como concluídos e preenchendo o campo
          &quot;Carga usada&quot;.
        </Card>
      ) : (
        <div className="space-y-4">
          {withData.map((we: any) => {
            const points = logsByExercise.get(we.id) ?? [];
            const first = points[0]?.value;
            const last = points[points.length - 1]?.value;
            const change =
              points.length >= 2 && first ? Math.round(((last - first) / first) * 100) : null;

            return (
              <Card key={we.id}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-xs text-blue">
                    Treino {we.label} · prescrita: {we.load || "peso corporal"} · {we.sets ?? "-"}{" "}
                    séries
                  </p>
                  {change !== null && (
                    <span
                      className={`flex-none rounded-full px-2.5 py-1 text-xs font-semibold ${
                        change > 0
                          ? "bg-orange/15 text-orange"
                          : change < 0
                            ? "bg-navy/10 text-navy"
                            : "bg-lightblue/15 text-blue"
                      }`}
                    >
                      {change > 0 ? "+" : ""}
                      {change}%
                    </span>
                  )}
                </div>
                <ProgressChart
                  title={we.exercises?.name ?? "Exercício"}
                  unit="kg"
                  data={points}
                  emptyMessage="Precisa de pelo menos 2 registros de carga pra mostrar a evolução."
                />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
