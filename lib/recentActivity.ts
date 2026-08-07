// Detecta quais alunos concluíram uma ficha inteira (todos os exercícios
// de um treino+label) HOJE, pra mostrar um feed de atividade recente pro
// personal no dashboard. Puro TS, sem I/O, testável isoladamente — mesmo
// padrão do lib/atRisk.ts.

export type CompletedWorkout = {
  studentId: string;
  studentName: string;
  workoutName: string;
  label: string;
  completedAt: string; // ISO timestamp do último exercício concluído
};

export function computeTodayCompletions(
  students: { id: string; name: string }[],
  workouts: { id: string; student_id: string; name: string }[],
  workoutExercises: { id: string; workout_id: string; label: string }[],
  todayLogs: { student_id: string; workout_exercise_id: string; completed: boolean; created_at: string }[]
): CompletedWorkout[] {
  const studentNameById = new Map(students.map((s) => [s.id, s.name]));
  const workoutById = new Map(workouts.map((w) => [w.id, w]));

  // quantos exercícios cada ficha (workout_id + label) tem no total, e a
  // qual ficha cada exercício pertence
  const groupByExerciseId = new Map<string, { workoutId: string; label: string }>();
  const totalByGroup = new Map<string, number>();
  for (const we of workoutExercises) {
    const groupKey = `${we.workout_id}|${we.label}`;
    groupByExerciseId.set(we.id, { workoutId: we.workout_id, label: we.label });
    totalByGroup.set(groupKey, (totalByGroup.get(groupKey) ?? 0) + 1);
  }

  // quantos exercícios concluídos hoje, por aluno + ficha
  const completedByStudentGroup = new Map<
    string,
    { studentId: string; workoutId: string; label: string; count: number; lastAt: string }
  >();
  for (const log of todayLogs) {
    if (!log.completed) continue;
    const group = groupByExerciseId.get(log.workout_exercise_id);
    if (!group) continue;

    const key = `${log.student_id}|${group.workoutId}|${group.label}`;
    const entry = completedByStudentGroup.get(key) ?? {
      studentId: log.student_id,
      workoutId: group.workoutId,
      label: group.label,
      count: 0,
      lastAt: log.created_at,
    };
    entry.count += 1;
    if (log.created_at > entry.lastAt) entry.lastAt = log.created_at;
    completedByStudentGroup.set(key, entry);
  }

  const results: CompletedWorkout[] = [];
  for (const entry of completedByStudentGroup.values()) {
    const total = totalByGroup.get(`${entry.workoutId}|${entry.label}`) ?? 0;
    if (total === 0 || entry.count < total) continue; // só ficha 100% concluída

    const workout = workoutById.get(entry.workoutId);
    const studentName = studentNameById.get(entry.studentId);
    if (!workout || !studentName) continue;

    results.push({
      studentId: entry.studentId,
      studentName,
      workoutName: workout.name,
      label: entry.label,
      completedAt: entry.lastAt,
    });
  }

  results.sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  return results;
}
