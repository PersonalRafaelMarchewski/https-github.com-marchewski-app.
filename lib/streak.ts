// Calcula a sequência atual de dias consecutivos treinando, olhando pra
// trás a partir de hoje (ou de ontem, se hoje ainda não tiver treino).
export function calculateStreak(trainedDates: string[], referenceDate: Date = new Date()): number {
  const dateSet = new Set(trainedDates);
  const cursor = new Date(referenceDate);

  function key(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  if (!dateSet.has(key(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (dateSet.has(key(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
