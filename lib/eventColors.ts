// Paleta de cores de evento do Google Agenda (as 11 cores padrão, mesmos
// nomes e tons que aparecem lá). Guardamos só o hex no banco — null/vazio
// significa "sem cor", cai no laranja padrão do app.
export const EVENT_COLORS = [
  { name: "Lavanda", hex: "#7986cb" },
  { name: "Sálvia", hex: "#33b679" },
  { name: "Uva", hex: "#8e24aa" },
  { name: "Flamingo", hex: "#e67c73" },
  { name: "Banana", hex: "#f6c026" },
  { name: "Tangerina", hex: "#f5511d" },
  { name: "Pavão", hex: "#039be5" },
  { name: "Grafite", hex: "#616161" },
  { name: "Mirtilo", hex: "#3f51b5" },
  { name: "Manjericão", hex: "#0b8043" },
  { name: "Tomate", hex: "#d60000" },
] as const;

export function colorName(hex: string | null | undefined): string | null {
  if (!hex) return null;
  return EVENT_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? null;
}

// pro fundo levemente tingido do bloco na agenda (equivalente ao que o
// Tailwind faz com "bg-orange/15", mas com uma cor dinâmica em hex)
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
