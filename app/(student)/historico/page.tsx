import { createClient, getAuthUser } from "@/lib/supabase/server";
import StudentCard from "@/components/student/StudentCard";
import ProgressChart from "@/components/ProgressChart";
import TrainingCalendar from "@/components/TrainingCalendar";
import DeleteButton from "@/components/DeleteButton";
import { Flame } from "lucide-react";
import { calculateStreak } from "@/lib/streak";
import { deleteOwnWorkoutSession } from "./actions";

export default async function HistoricoPage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  if (!student) {
    return <StudentCard className="text-blue">Nenhum histórico ainda.</StudentCard>;
  }

  // "Dia treinado" só conta quando o aluno aperta "Concluir treino" de
  // verdade (cria uma linha em workout_sessions) — marcar exercícios pela
  // bolinha sozinho, sem apertar concluir, não deve subir pro histórico.
  // O histórico mostra o TREINO finalizado (nome da ficha), não exercício
  // por exercício.
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, session_date, workout_id, label, completed_exercises, total_exercises, rating, workouts:workout_id (name)")
    .eq("student_id", student.id)
    .order("session_date", { ascending: false });

  const trainedDates = [...new Set((sessions ?? []).map((s) => s.session_date))];
  const streak = calculateStreak(trainedDates);

  const sessionsByDate: Record<
    string,
    { id: string; workoutName: string; label: string; completedExercises: number; totalExercises: number; rating: number | null }[]
  > = {};
  for (const s of (sessions ?? []) as any[]) {
    const list = sessionsByDate[s.session_date] ?? [];
    list.push({
      id: s.id,
      workoutName: s.workouts?.name ?? "Treino",
      label: s.label,
      completedExercises: s.completed_exercises,
      totalExercises: s.total_exercises,
      rating: s.rating,
    });
    sessionsByDate[s.session_date] = list;
  }

  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("id, date, weight, body_fat")
    .eq("student_id", student.id)
    .order("date", { ascending: false });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-navy">Histórico</h1>

      <StudentCard className="mb-6 flex items-center gap-3">
        <Flame className="text-orange" size={28} />
        <div>
          <p className="font-heading text-xl font-bold text-navy">{streak} dias</p>
          <p className="text-sm text-blue">de sequência treinando</p>
        </div>
      </StudentCard>

      <StudentCard className="mb-6">
        <TrainingCalendar
          trainedDates={trainedDates}
          sessionsByDate={sessionsByDate}
          deleteSessionAction={deleteOwnWorkoutSession}
          rounded
        />
      </StudentCard>

      {evaluations && evaluations.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 font-heading font-semibold text-navy">Minha evolução</h2>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StudentCard>
              <ProgressChart
                title="Peso"
                unit="kg"
                data={evaluations
                  .filter((ev) => ev.weight != null)
                  .map((ev) => ({ date: ev.date, value: ev.weight as number }))}
              />
            </StudentCard>
            <StudentCard>
              <ProgressChart
                title="% Gordura"
                unit="%"
                data={evaluations
                  .filter((ev) => ev.body_fat != null)
                  .map((ev) => ({ date: ev.date, value: ev.body_fat as number }))}
              />
            </StudentCard>
          </div>
          <div className="space-y-2">
            {evaluations.map((ev) => (
              <StudentCard key={ev.id} className="flex items-center justify-between">
                <p className="text-navy">
                  {ev.weight ? `${ev.weight}kg` : "—"}
                  {ev.body_fat ? ` · ${ev.body_fat}% gordura` : ""}
                </p>
                <span className="text-sm text-blue">{ev.date}</span>
              </StudentCard>
            ))}
          </div>
        </div>
      )}

      {Object.keys(sessionsByDate).length === 0 ? (
        <StudentCard className="text-blue">Nenhum treino concluído ainda.</StudentCard>
      ) : (
        <div className="space-y-4">
          {Object.entries(sessionsByDate)
            .sort(([a], [b]) => (a < b ? 1 : -1))
            .map(([date, daySessions]) => (
              <div key={date}>
                <p className="mb-2 text-sm font-semibold text-blue">{date}</p>
                <div className="space-y-2">
                  {daySessions.map((session) => (
                    <StudentCard key={session.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-navy">
                          {session.workoutName}
                          {session.label ? ` — ${session.label}` : ""}
                        </p>
                        <p className="text-sm text-blue">
                          {session.completedExercises}/{session.totalExercises} exercícios
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.rating && (
                          <span className="text-sm text-blue">nota {session.rating}/5</span>
                        )}
                        <DeleteButton
                          action={deleteOwnWorkoutSession.bind(null, session.id)}
                          confirmMessage={`Apagar o treino "${session.workoutName}" desse dia?`}
                        />
                      </div>
                    </StudentCard>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
