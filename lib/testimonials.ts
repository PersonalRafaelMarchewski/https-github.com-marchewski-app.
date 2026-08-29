// Constantes dos depoimentos — fora do arquivo "use server" (que só pode
// exportar funções async), compartilhadas entre formulário do aluno,
// action e lista do personal.
export const TRAINING_TIME_OPTIONS = [
  "Menos de 3 meses",
  "De 3 a 6 meses",
  "De 6 meses a 1 ano",
  "De 1 a 2 anos",
  "Mais de 2 anos",
] as const;

export const RATING_LABELS: Record<number, string> = {
  1: "Ruim",
  2: "Regular",
  3: "Bom",
  4: "Muito bom",
  5: "Excelente",
};

export const TRAINER_WHATSAPP = "5515991616955";

// Mensagem pronta pro WhatsApp — mesma da página avulsa de depoimentos
export function buildTestimonialMessage(s: {
  displayName: string;
  trainingTime: string;
  rating: number;
  body: string;
  authorized: boolean;
}) {
  return [
    "Olá, Rafael! Aqui vai o meu depoimento:",
    "",
    `Nome: ${s.displayName}`,
    `Tempo de treino: ${s.trainingTime}`,
    `Nota: ${"★".repeat(s.rating)} (${s.rating}/5, ${RATING_LABELS[s.rating]})`,
    "",
    s.body,
    "",
    s.authorized
      ? "Autorizo o uso do depoimento e do meu primeiro nome no site e redes sociais."
      : "Prefiro que o depoimento não seja divulgado publicamente.",
  ].join("\n");
}
