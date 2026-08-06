// Campos de circunferência e dobras cutâneas da avaliação física —
// fonte única usada tanto no formulário (criar/editar) quanto na
// exibição (página do aluno), pra manter chave/rótulo/unidade
// sempre em sincronia.

export type EvaluationField = { key: string; label: string; unit: string };

export const CIRCUMFERENCE_FIELDS: EvaluationField[] = [
  { key: "cintura", label: "Cintura", unit: "cm" },
  { key: "quadril", label: "Quadril", unit: "cm" },
  { key: "peito", label: "Peito", unit: "cm" },
  { key: "braco", label: "Braço", unit: "cm" },
  { key: "coxa", label: "Coxa", unit: "cm" },
  { key: "abdomen", label: "Abdômen", unit: "cm" },
  { key: "antebraco", label: "Antebraço", unit: "cm" },
  { key: "panturrilha", label: "Panturrilha", unit: "cm" },
  { key: "pescoco", label: "Pescoço", unit: "cm" },
  { key: "ombro", label: "Ombro", unit: "cm" },
];

// Protocolo de 7 dobras (o mais usado no Brasil) — em mm.
export const SKINFOLD_FIELDS: EvaluationField[] = [
  { key: "dobra_triceps", label: "Tríceps", unit: "mm" },
  { key: "dobra_subescapular", label: "Subescapular", unit: "mm" },
  { key: "dobra_suprailiaca", label: "Suprailíaca", unit: "mm" },
  { key: "dobra_abdominal", label: "Abdominal", unit: "mm" },
  { key: "dobra_peitoral", label: "Peitoral", unit: "mm" },
  { key: "dobra_axilar", label: "Axilar média", unit: "mm" },
  { key: "dobra_coxa", label: "Coxa", unit: "mm" },
];

const ALL_MEASUREMENT_FIELDS = [...CIRCUMFERENCE_FIELDS, ...SKINFOLD_FIELDS];

export function measurementLabel(key: string): { label: string; unit: string } {
  const field = ALL_MEASUREMENT_FIELDS.find((f) => f.key === key);
  return field ? { label: field.label, unit: field.unit } : { label: key, unit: "" };
}
