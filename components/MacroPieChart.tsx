// Gráfico de pizza (anel) mostrando a proporção de proteína/carbo/gordura
// de um alimento ou de um total — em % de CALORIA, não de grama (grama
// engana: 1g de gordura tem mais que o dobro da caloria de 1g de
// proteína/carbo, então "metade dos gramas" não é "metade da pizza").
// Mesma técnica do anel do RestTimer (stroke-dasharray num círculo),
// só que com 3 segmentos coloridos em vez de progresso único.

export const MACRO_COLORS = {
  protein: "#2F4599", // blue
  carb: "#ED5B35", // orange
  fat: "#F3A888", // peach
};

export default function MacroPieChart({
  proteinG,
  carbsG,
  fatG,
  size = 40,
  strokeWidth,
}: {
  proteinG: number;
  carbsG: number;
  fatG: number;
  size?: number;
  strokeWidth?: number;
}) {
  const pKcal = Math.max(0, proteinG) * 4;
  const cKcal = Math.max(0, carbsG) * 4;
  const fKcal = Math.max(0, fatG) * 9;
  const total = pKcal + cKcal + fKcal;

  const sw = strokeWidth ?? Math.max(4, Math.round(size * 0.22));
  const r = (size - sw) / 2;
  const circumference = 2 * Math.PI * r;

  if (total <= 0) {
    // sem dado nenhum ainda — anel vazio, não esconde o espaço todo
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-none">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#8499CC" strokeOpacity={0.15} strokeWidth={sw} />
      </svg>
    );
  }

  const segments = [
    { pct: pKcal / total, color: MACRO_COLORS.protein },
    { pct: cKcal / total, color: MACRO_COLORS.carb },
    { pct: fKcal / total, color: MACRO_COLORS.fat },
  ];

  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 flex-none">
      {segments.map((seg, i) => {
        if (seg.pct <= 0) return null;
        const dash = seg.pct * circumference;
        const circle = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={sw}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
          />
        );
        offset += dash;
        return circle;
      })}
    </svg>
  );
}

// Legenda compacta reaproveitada nos dois lugares (item de alimento e
// resumo do dia) — mostra o % de cada macro por cima da cor do anel.
export function MacroPieLegend({ proteinG, carbsG, fatG }: { proteinG: number; carbsG: number; fatG: number }) {
  const pKcal = Math.max(0, proteinG) * 4;
  const cKcal = Math.max(0, carbsG) * 4;
  const fKcal = Math.max(0, fatG) * 9;
  const total = pKcal + cKcal + fKcal;
  const pct = (kcal: number) => (total > 0 ? Math.round((kcal / total) * 100) : 0);

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
      <span className="flex items-center gap-1 text-blue">
        <span className="h-2 w-2 rounded-full" style={{ background: MACRO_COLORS.protein }} />
        P {pct(pKcal)}%
      </span>
      <span className="flex items-center gap-1 text-blue">
        <span className="h-2 w-2 rounded-full" style={{ background: MACRO_COLORS.carb }} />
        C {pct(cKcal)}%
      </span>
      <span className="flex items-center gap-1 text-blue">
        <span className="h-2 w-2 rounded-full" style={{ background: MACRO_COLORS.fat }} />
        G {pct(fKcal)}%
      </span>
    </div>
  );
}
