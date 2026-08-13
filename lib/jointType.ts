// Classificação biomecânica do exercício por número de articulações
// envolvidas no movimento — ajuda a montar treino balanceado (ex: não
// empilhar só multiarticulares no fim do treino, quando o aluno já tá
// mais cansado e a técnica mais arriscada de perder).

export const JOINT_TYPE_OPTIONS = [
  { value: "monoarticular", label: "Monoarticular" },
  { value: "biarticular", label: "Biarticular" },
  { value: "multiarticular", label: "Multiarticular" },
] as const;

export function jointTypeLabel(jointType: string | null | undefined): string | null {
  return JOINT_TYPE_OPTIONS.find((j) => j.value === jointType)?.label ?? null;
}
