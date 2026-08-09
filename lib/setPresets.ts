// Esquemas prontos de série/repetição/descanso — clicar preenche os campos
// de uma vez, em vez de digitar tudo na mão. Mesma ideia dos "presets" do
// MFIT Personal.
export const SET_PRESETS = [
  { name: "Padrão", sets: "3", reps: "12", rest_seconds: "60", method: "" },
  { name: "Hipertrofia", sets: "4", reps: "8-12", rest_seconds: "90", method: "" },
  { name: "Força", sets: "5", reps: "5", rest_seconds: "120", method: "" },
  { name: "Resistência", sets: "3", reps: "15-20", rest_seconds: "45", method: "" },
  { name: "Pirâmide crescente", sets: "4", reps: "12,10,8,6", rest_seconds: "90", method: "Pirâmide" },
  { name: "Pirâmide decrescente", sets: "4", reps: "6,8,10,12", rest_seconds: "90", method: "Pirâmide" },
  { name: "Drop-set", sets: "3", reps: "10 + drop", rest_seconds: "30", method: "Drop-set" },
  { name: "Rest-pause", sets: "3", reps: "8 + rest-pause", rest_seconds: "20", method: "Rest-pause" },
  { name: "Até a falha", sets: "3", reps: "até a falha", rest_seconds: "60", method: "" },
] as const;

export type SetPreset = { sets: string; reps: string; rest_seconds: string; method: string };
