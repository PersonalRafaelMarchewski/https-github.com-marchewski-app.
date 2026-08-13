"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import Button from "@/components/Button";
import ActivityLevelPicker from "@/components/ActivityLevelPicker";
import {
  calculateAgeFromBirthDate,
  calculateBmr,
  computeMacroSplit,
  MACRO_SPLIT_PRESETS,
  type MacroSplitPreset,
} from "@/lib/nutritionCalc";
import { activityLevelFactor } from "@/lib/activityLevel";

export type CalculatorStudent = {
  sex: string | null;
  birthDate: string | null;
  activityLevel: string | null;
  latestWeight: number | null;
  latestHeight: number | null;
};

const DEFICIT_SURPLUS_OPTIONS = [
  { value: -500, label: "-500" },
  { value: -250, label: "-250" },
  { value: 0, label: "Manutenção" },
  { value: 250, label: "+250" },
  { value: 500, label: "+500" },
];

export default function CalorieCalculator({
  student,
  onApply,
}: {
  student: CalculatorStudent;
  onApply: (calories: number, macros: { protein: number; carbs: number; fat: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activityLevel, setActivityLevel] = useState(student.activityLevel ?? "");
  const [adjustment, setAdjustment] = useState(0);
  const [customAdjustment, setCustomAdjustment] = useState("");
  const [macroSplitId, setMacroSplitId] = useState(MACRO_SPLIT_PRESETS[0].id);
  const [customProteinPct, setCustomProteinPct] = useState("30");
  const [customCarbsPct, setCustomCarbsPct] = useState("40");
  const [customFatPct, setCustomFatPct] = useState("30");

  const missing: string[] = [];
  if (student.sex !== "M" && student.sex !== "F") missing.push("sexo biológico");
  if (!student.birthDate) missing.push("data de nascimento");
  if (!student.latestWeight) missing.push("peso (numa avaliação)");
  if (!student.latestHeight) missing.push("altura (numa avaliação)");

  const canCalculate = missing.length === 0;

  const bmr = useMemo(() => {
    if (!canCalculate) return null;
    return calculateBmr({
      sex: student.sex as "M" | "F",
      weightKg: student.latestWeight!,
      heightCm: student.latestHeight!,
      age: calculateAgeFromBirthDate(student.birthDate!),
    });
  }, [canCalculate, student]);

  const factor = activityLevelFactor(activityLevel);
  const tdee = bmr && factor ? Math.round(bmr * factor) : null;
  const effectiveAdjustment = customAdjustment.trim() !== "" ? Number(customAdjustment) || 0 : adjustment;
  const target = tdee != null ? Math.max(0, tdee + effectiveAdjustment) : null;

  const activeSplit: MacroSplitPreset =
    macroSplitId === "personalizado"
      ? {
          id: "personalizado",
          label: "Personalizado",
          description: "",
          proteinPct: Number(customProteinPct) || 0,
          carbsPct: Number(customCarbsPct) || 0,
          fatPct: Number(customFatPct) || 0,
        }
      : (MACRO_SPLIT_PRESETS.find((p) => p.id === macroSplitId) ?? MACRO_SPLIT_PRESETS[0]);

  const customPctSum = (Number(customProteinPct) || 0) + (Number(customCarbsPct) || 0) + (Number(customFatPct) || 0);

  const macros = target != null ? computeMacroSplit(target, student.latestWeight!, activeSplit) : null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-orange hover:underline"
      >
        <Calculator size={14} />
        Calcular meta calórica
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-lightblue/40 bg-lightblue/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-navy">
          <Calculator size={15} className="text-orange" />
          Calculadora de meta calórica
        </p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-blue hover:underline">
          Fechar
        </button>
      </div>

      {!canCalculate ? (
        <p className="text-sm text-orange">
          Falta preencher pra esse aluno: {missing.join(", ")}. Sexo biológico fica no cadastro/edição do
          aluno; peso e altura, numa avaliação física.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-blue">
            Basal (Mifflin-St Jeor): <span className="font-semibold text-navy">{bmr} kcal</span>
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Nível de atividade</label>
            <ActivityLevelPicker name="_calc_activity" value={activityLevel} onChange={setActivityLevel} bmr={bmr} />
          </div>

          {tdee != null && (
            <>
              <p className="text-sm text-blue">
                Gasto total estimado: <span className="font-semibold text-navy">{tdee} kcal</span>
              </p>

              <div>
                <label className="mb-1 block text-sm font-medium text-navy">Déficit / superávit (kcal)</label>
                <div className="flex flex-wrap gap-1.5">
                  {DEFICIT_SURPLUS_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => {
                        setAdjustment(o.value);
                        setCustomAdjustment("");
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        adjustment === o.value && customAdjustment.trim() === ""
                          ? "bg-orange text-white"
                          : "bg-lightblue/15 text-navy hover:bg-lightblue/25"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                  <input
                    value={customAdjustment}
                    onChange={(e) => setCustomAdjustment(e.target.value)}
                    placeholder="outro valor"
                    className="w-24 rounded-full border border-lightblue/50 px-3 py-1.5 text-xs outline-none focus:border-orange"
                  />
                </div>
              </div>

              {target != null && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-navy">Divisão de macros</label>
                  <div className="flex flex-wrap gap-1.5">
                    {MACRO_SPLIT_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setMacroSplitId(p.id)}
                        title={p.description}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          macroSplitId === p.id
                            ? "bg-orange text-white"
                            : "bg-lightblue/15 text-navy hover:bg-lightblue/25"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setMacroSplitId("personalizado")}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        macroSplitId === "personalizado"
                          ? "bg-orange text-white"
                          : "bg-lightblue/15 text-navy hover:bg-lightblue/25"
                      }`}
                    >
                      Personalizado
                    </button>
                  </div>

                  {macroSplitId === "personalizado" && (
                    <div className="mt-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="mb-0.5 block text-[11px] text-blue">Proteína %</label>
                          <input
                            value={customProteinPct}
                            onChange={(e) => setCustomProteinPct(e.target.value)}
                            className="w-full rounded-lg border border-lightblue/50 px-2 py-1.5 text-sm outline-none focus:border-orange"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="mb-0.5 block text-[11px] text-blue">Carbo %</label>
                          <input
                            value={customCarbsPct}
                            onChange={(e) => setCustomCarbsPct(e.target.value)}
                            className="w-full rounded-lg border border-lightblue/50 px-2 py-1.5 text-sm outline-none focus:border-orange"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="mb-0.5 block text-[11px] text-blue">Gordura %</label>
                          <input
                            value={customFatPct}
                            onChange={(e) => setCustomFatPct(e.target.value)}
                            className="w-full rounded-lg border border-lightblue/50 px-2 py-1.5 text-sm outline-none focus:border-orange"
                          />
                        </div>
                      </div>
                      {customPctSum !== 100 && (
                        <p className="mt-1 text-[11px] text-orange">Soma atual: {customPctSum}% (ideal somar 100%)</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {target != null && macros && (
                <div className="rounded-lg bg-white p-3">
                  <p className="text-sm text-navy">
                    Meta: <span className="font-bold">{target} kcal</span>
                  </p>
                  <p className="text-xs text-blue">
                    Sugestão de macros: P {macros.protein}g ({macros.proteinPct}%) · C {macros.carbs}g (
                    {macros.carbsPct}%) · G {macros.fat}g ({macros.fatPct}%)
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      onApply(target, macros);
                      setOpen(false);
                    }}
                    className="mt-2 w-full"
                  >
                    Aplicar nas metas diárias
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
