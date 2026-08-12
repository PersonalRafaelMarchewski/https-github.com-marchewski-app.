// Detecta quais alunos concluíram uma ficha HOJE (apertaram "Concluir
// treino" de verdade — não basta marcar os exercícios pela bolinha sem
// concluir), pra mostrar um feed de atividade recente pro personal no
// dashboard. Puro TS, sem I/O, testável isoladamente — mesmo padrão do
// lib/atRisk.ts.

export type CompletedWorkout = {
  studentId: string;
  studentName: string;
  workoutName: string;
  label: string;
  completedAt: string; // ISO timestamp de quando apertou "Concluir treino"
};

export function computeTodayCompletions(
  students: { id: string; name: string }[],
  workouts: { id: string; student_id: string; name: string }[],
  todaySessions: { student_id: string; workout_id: string; label: string; created_at: string }[]
): CompletedWorkout[] {
  const studentNameById = new Map(students.map((s) => [s.id, s.name]));
  const workoutById = new Map(workouts.map((w) => [w.id, w]));

  const results: CompletedWorkout[] = [];
  for (const session of todaySessions) {
    const workout = workoutById.get(session.workout_id);
    const studentName = studentNameById.get(session.student_id);
    if (!workout || !studentName) continue;

    results.push({
      studentId: session.student_id,
      studentName,
      workoutName: workout.name,
      label: session.label,
      completedAt: session.created_at,
    });
  }

  results.sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  return results;
}
