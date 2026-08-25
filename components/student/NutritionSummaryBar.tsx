"use client";

import StudentCard from "@/components/student/StudentCard";
import MacroPieChart, { MacroPieLegend } from "@/components/MacroPieChart";
import type { Macros } from "@/lib/nutrition";

type Targets = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

function MacroBlock({ label, unit, consumed, target }: { label: string; unit: string; consumed: number; target: number | null }) {
  if (target == null) return null;
  const pct = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;
  const over = consumed > target;
  return (
    <div className="min-w-0 flex-1 rounded-2xl bg-lightblue/10 px-3 py-2">
      <p className="text-xs font-medium text-navy">{label}</p>
      <p className="text-sm text-blue">
        {consumed}/{target}
        {unit}
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-lightblue/20">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-orange" : "bg-gradient-to-r from-orange to-orange2"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Resumo do dia inspirado na tela "Hoje" do app Alimente-se — atualiza
// na hora conforme o aluno registra o que comeu no diário livre, sem
// esperar recarregar a página (mesma sensação do timer de descanso do
// treino, que também atualiza sozinho).
export default function NutritionSummaryBar({
  consumed,
  targets,
  weightKg = null,
}: {
  consumed: Macros;
  targets: Targets;
  // peso da última avaliação — habilita a linha de g por kg de peso
  weightKg?: number | null;
}) {
  const hasAnyTarget =
    targets.calories != null || targets.protein != null || targets.carbs != null || targets.fat != null;

  if (!hasAnyTarget) {
    return (
      <StudentCard className="mb-4">
        <p className="text-sm text-blue">Registrado hoje no diário</p>
        <p className="font-heading text-2xl font-bold text-navy">{consumed.calories} kcal</p>
      </StudentCard>
    );
  }

  const calorieTarget = targets.calories;
  const remaining = calorieTarget != null ? calorieTarget - consumed.calories : null;
  const overCalories = remaining != null && remaining < 0;
  const caloriePct =
    calorieTarget && calorieTarget > 0 ? Math.min(100, Math.round((consumed.calories / calorieTarget) * 100)) : 0;

  return (
    <StudentCard className="mb-4">
      {remaining != null ? (
        <>
          <p className="text-sm text-blue">
            Consumiu {consumed.calories} de {calorieTarget} calorias
          </p>
          <p className={`font-heading text-3xl font-bold ${overCalories ? "text-orange" : "text-navy"}`}>
            {Math.abs(remaining)}
            <span className="ml-1 text-base font-medium text-blue">
              kcal {overCalories ? "excedidas" : "restantes"}
            </span>
          </p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-lightblue/15">
            <div
              className={`h-full rounded-full transition-all ${overCalories ? "bg-orange" : "bg-gradient-to-r from-orange to-orange2"}`}
              style={{ width: `${caloriePct}%` }}
            />
          </div>
        </>
      ) : (
        <p className="font-heading text-2xl font-bold text-navy">{consumed.calories} kcal registradas hoje</p>
      )}

      <div className="mt-3 flex gap-2">
        <MacroBlock label="Carbo" unit="g" consumed={consumed.carbs} target={targets.carbs} />
        <MacroBlock label="Proteína" unit="g" consumed={consumed.protein} target={targets.protein} />
        <MacroBlock label="Gordura" unit="g" consumed={consumed.fat} target={targets.fat} />
      </div>

      {/* proporção P/C/G do que já foi comido hoje — as barras acima
          mostram cada macro contra a própria meta, mas não dá pra ver de
          relance "de tudo que já comi, quanto foi proteína x carbo x
          gordura" — é isso que a pizza responde */}
      {consumed.calories > 0 && (
        <div className="mt-3 flex items-center gap-3 border-t border-lightblue/20 pt-3">
          <MacroPieChart size={72} proteinG={consumed.protein} carbsG={consumed.carbs} fatG={consumed.fat} />
          <div>
            <p className="text-xs text-blue">Do que já comeu hoje</p>
            <MacroPieLegend proteinG={consumed.protein} carbsG={consumed.carbs} fatG={consumed.fat} />
          </div>
        </div>
      )}

      {/* g por kg de peso corporal — o número que orienta prescrição de
          verdade (proteína em especial). Usa o peso da última avaliação. */}
      {consumed.calories > 0 && weightKg != null && weightKg > 0 && (
        <p className="mt-2 text-xs text-blue">
          Por kg de peso ({weightKg.toLocaleString("pt-BR")} kg):{" "}
          <span className="font-semibold text-navy">
            P {(consumed.protein / weightKg).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
          </span>{" · "}
          <span className="font-semibold text-navy">
            C {(consumed.carbs / weightKg).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
          </span>{" · "}
          <span className="font-semibold text-navy">
            G {(consumed.fat / weightKg).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
          </span>{" "}
          g/kg
        </p>
      )}
    </StudentCard>
  );
}
