// Lembrete de reavaliação física: olha a avaliação mais recente de cada
// aluno e vê se a "próxima avaliação" marcada já chegou ou passou.
export type ReassessmentDue = { id: string; name: string; dueDate: string; overdue: boolean };

export function computeReassessmentsDue(
  students: { id: string; name: string }[],
  evaluations: { student_id: string; date: string; next_assessment_date: string | null }[]
): ReassessmentDue[] {
  const today = new Date().toISOString().slice(0, 10);

  // evaluations chega ordenado por date desc — guarda só a primeira
  // ocorrência (a mais recente) de cada aluno
  const latestByStudent = new Map<string, { next_assessment_date: string | null }>();
  for (const ev of evaluations) {
    if (!latestByStudent.has(ev.student_id)) {
      latestByStudent.set(ev.student_id, { next_assessment_date: ev.next_assessment_date });
    }
  }

  const nameById = new Map(students.map((s) => [s.id, s.name]));
  const due: ReassessmentDue[] = [];

  for (const [studentId, ev] of latestByStudent) {
    if (!ev.next_assessment_date || ev.next_assessment_date > today) continue;
    due.push({
      id: studentId,
      name: nameById.get(studentId) ?? "Aluno",
      dueDate: ev.next_assessment_date,
      overdue: ev.next_assessment_date < today,
    });
  }

  return due.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
