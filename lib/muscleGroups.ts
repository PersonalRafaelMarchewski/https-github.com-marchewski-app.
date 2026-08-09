// Grupos musculares prontos pra escolher ao cadastrar um exercício — mesmos
// nomes já usados na biblioteca (supabase/seed-exercises*.sql), pra manter o
// resumo de volume por grupo e os filtros consistentes em vez de cada
// exercício novo vir com um texto digitado à mão (ex: "peito" vs "Peito").
export const MUSCLE_GROUP_OPTIONS = [
  "Peito",
  "Costas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Antebraço",
  "Abdômen",
  "Pernas",
  "Posterior de coxa",
  "Glúteos",
  "Panturrilha",
  "Trapézio",
  "Cardio",
] as const;
