import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import ProgressChart from "@/components/ProgressChart";
import TrainingCalendar from "@/components/TrainingCalendar";
import DeleteButton from "@/components/DeleteButton";
import { Flame } from "lucide-react";
import { calculateStreak } from "@/lib/streak";
import { deleteOwnWorkoutLog } from "./actions";

export default async function HistoricoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  if (!student) {
    return <Card className="text-blue">Nenhum histórico ainda.</Card>;
  }

  const { data: logs } = await supabase
    .from("workout_logs")
    .select(
      "id, date, completed, difficulty_rating, feedback_text, workout_exercises:workout_exercise_id (exercises:exercise_id (name))"
    )
    .eq("student_id", student.id)
    .eq("completed", true)
    .order("date", { ascending: false });

  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("id, date, weight, body_fat")
    .eq("student_id", student.id)
    .order("date", { ascending: false });

  const trainedDates = [...new Set((logs ?? []).map((l) => l.date))];
  const streak = calculateStreak(trainedDates);

  const groupedByDate = new Map<string, typeof logs>();
  for (const log of logs ?? []) {
    const group = groupedByDate.get(log.date) ?? [];
    group.push(log);
    groupedByDate.set(log.date, group as any);
  }

  const logsByDate: Record<string, { id: string; exerciseName: string }[]> = {};
  for (const log of (logs ?? []) as any[]) {
    const list = logsByDate[log.date] ?? [];
    list.push({ id: log.id, exerciseName: log.workout_exercises?.exercises?.name ?? "Exercício" });
    logsByDate[log.date] = list;
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-navy">Histórico</h1>

      <Card className="mb-6 flex items-center gap-3">
        <Flame className="text-orange" size={28} />
        <div>
          <p className="font-heading text-xl font-bold text-navy">{streak} dias</p>
          <p className="text-sm text-blue">de sequência treinando</p>
        </div>
      </Card>

      <Card className="mb-6">
        <TrainingCalendar
          trainedDates={trainedDates}
          logsByDate={logsByDate}
          deleteAction={deleteOwnWorkoutLog}
        />
      </Card>

      {evaluations && evaluations.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 font-heading font-semibold text-navy">Minha evolução</h2>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <ProgressChart
                title="Peso"
                unit="kg"
                data={evaluations
                  .filter((ev) => ev.weight != null)
                  .map((ev) => ({ date: ev.date, value: ev.weight as number }))}
              />
            </Card>
            <Card>
              <ProgressChart
                title="% Gordura"
                unit="%"
                data={evaluations
                  .filter((ev) => ev.body_fat != null)
                  .map((ev) => ({ date: ev.date, value: ev.body_fat as number }))}
              />
            </Card>
          </div>
          <div className="space-y-2">
            {evaluations.map((ev) => (
              <Card key={ev.id} className="flex items-center justify-between">
                <p className="text-navy">
                  {ev.weight ? `${ev.weight}kg` : "—"}
                  {ev.body_fat ? ` · ${ev.body_fat}% gordura` : ""}
                </p>
                <span className="text-sm text-blue">{ev.date}</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {groupedByDate.size === 0 ? (
        <Card className="text-blue">Nenhum treino concluído ainda.</Card>
      ) : (
        <div className="space-y-4">
          {[...groupedByDate.entries()].map(([date, dayLogs]) => (
            <div key={date}>
              <p className="mb-2 text-sm font-semibold text-blue">{date}</p>
              <div className="space-y-2">
                {(dayLogs ?? []).map((log: any) => (
                  <Card key={log.id} className="flex items-center justify-between">
                    <p className="text-navy">{log.workout_exercises?.exercises?.name ?? "Exercício"}</p>
                    <div className="flex items-center gap-2">
                      {log.difficulty_rating && (
                        <span className="text-sm text-blue">dificuldade {log.difficulty_rating}/5</span>
                      )}
                      <DeleteButton
                        action={deleteOwnWorkoutLog.bind(null, log.id)}
                        confirmMessage={`Apagar o registro de "${log.workout_exercises?.exercises?.name ?? "esse exercício"}"?`}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
