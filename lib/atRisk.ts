// Detecta alunos ativos que podem estar "esfriando" — sem treinar há
// alguns dias, ou que nunca chegaram a começar. Puro TS, sem I/O, pra
// poder ser testado isoladamente e usado tanto no dashboard quanto em
// outros lugares no futuro (ex: push notification pro personal).

export type RiskStudent = {
  id: string;
  name: string;
  daysSinceLastTrained: number | null; // null quando nunca treinou
  neverTrained: boolean;
};

export function computeAtRiskStudents(
  students: { id: string; name: string }[],
  completedLogs: { student_id: string; date: string }[],
  workouts: { student_id: string; start_date: string | null }[],
  thresholdDays: number = 5,
  referenceDate: Date = new Date()
): RiskStudent[] {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  function daysSince(dateStr: string) {
    const d = new Date(`${dateStr}T12:00:00`); // meio-dia evita virar o dia por fuso
    return Math.floor((today.getTime() - d.getTime()) / 86_400_000);
  }

  // último dia com treino concluído, por aluno
  const lastTrainedByStudent = new Map<string, string>();
  for (const log of completedLogs) {
    const current = lastTrainedByStudent.get(log.student_id);
    if (!current || log.date > current) lastTrainedByStudent.set(log.student_id, log.date);
  }

  // início do treino mais antigo, por aluno (pra pegar quem nunca começou)
  const earliestStartByStudent = new Map<string, string>();
  for (const w of workouts) {
    if (!w.start_date) continue;
    const current = earliestStartByStudent.get(w.student_id);
    if (!current || w.start_date < current) earliestStartByStudent.set(w.student_id, w.start_date);
  }

  const result: RiskStudent[] = [];

  for (const s of students) {
    const lastDate = lastTrainedByStudent.get(s.id);

    if (lastDate) {
      const days = daysSince(lastDate);
      if (days >= thresholdDays) {
        result.push({ id: s.id, name: s.name, daysSinceLastTrained: days, neverTrained: false });
      }
      continue;
    }

    // nunca treinou — só entra na lista se já devia ter começado há um tempo
    const earliestStart = earliestStartByStudent.get(s.id);
    if (earliestStart && daysSince(earliestStart) >= thresholdDays) {
      result.push({ id: s.id, name: s.name, daysSinceLastTrained: null, neverTrained: true });
    }
  }

  result.sort((a, b) => (b.daysSinceLastTrained ?? 9999) - (a.daysSinceLastTrained ?? 9999));
  return result;
}
