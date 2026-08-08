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

// As duas "empresas" que a aba Finanças separa — cada lançamento pertence
// a uma delas.
export const BUSINESS_OPTIONS = [
  { value: "assessoria", label: "Assessoria" },
  { value: "personal", label: "Personal" },
] as const;

export type Business = (typeof BUSINESS_OPTIONS)[number]["value"];

export function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
