// Nível de treinamento do aluno — usado no cadastro/edição e exibido
// como referência rápida pro personal (ex: na hora de montar um treino).

export const LEVEL_OPTIONS = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
] as const;

export function levelLabel(level: string | null | undefined): string {
  return LEVEL_OPTIONS.find((l) => l.value === level)?.label ?? "Intermediário";
}
