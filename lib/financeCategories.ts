// Categorias fixas dos lançamentos financeiros — mantém os relatórios
// consistentes (sem cada lançamento vir com um texto livre diferente).
export const INCOME_CATEGORIES = [
  "Mensalidade",
  "Personal avulso",
  "Avaliação física",
  "Outro",
] as const;

export const EXPENSE_CATEGORIES = [
  "Aluguel/Espaço",
  "Equipamento",
  "Marketing",
  "Salários/Comissões",
  "Impostos",
  "Manutenção",
  "Assinaturas/Software",
  "Outro",
] as const;

export function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
