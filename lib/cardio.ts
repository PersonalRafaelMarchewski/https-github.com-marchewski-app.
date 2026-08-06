// Exercícios de cardio são prescritos por tempo (ex: "20 min"), não
// por repetições — helper compartilhado pra detectar isso e manter a
// exibição consistente no formulário e nas telas do aluno.

export function isCardioGroup(muscleGroup: string | null | undefined): boolean {
  return (muscleGroup ?? "").trim().toLowerCase() === "cardio";
}

export function formatSetsReps(
  sets: number | null,
  reps: string | null,
  muscleGroup: string | null | undefined
): string {
  if (isCardioGroup(muscleGroup)) {
    // cardio com "rounds" (ex: 5 tiros de corrida) ainda mostra o número
    // de séries; cardio contínuo (1 série) mostra só a duração
    return sets && sets > 1 ? `${sets}x ${reps ?? "-"}` : reps ?? "-";
  }
  return `${sets ?? "-"}x${reps ?? "-"}`;
}
