"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Circle, ChevronDown, ChevronUp, Clock, Flame } from "lucide-react";
import { createClient } from "@/lib/supabase";
import StudentCard from "@/components/student/StudentCard";
import { saveWithSchemaCacheRetry } from "@/lib/supabaseRetry";

type Props = {
  mealId: string;
  studentId: string;
  date: string;
  name: string;
  suggestedTime: string | null;
  description: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  existingLogId: string | null;
  initialCompleted: boolean;
  initialActualFood: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
};

function MacroChip({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  if (value == null) return null;
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-lightblue/10 px-3 py-1.5 text-sm text-navy">
      <span className="text-orange">{label}</span>
      {value}
      {unit}
    </div>
  );
}

export default function MealCard({
  mealId,
  studentId,
  date,
  name,
  suggestedTime,
  description,
  calories,
  protein,
  carbs,
  fat,
  existingLogId,
  initialCompleted,
  initialActualFood,
  open,
  onOpenChange,
  onCompleted,
}: Props) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [logId, setLogId] = useState(existingLogId);
  const [actualFood, setActualFood] = useState(initialActualFood ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleToggleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    if (saving) return;
    const nextCompleted = !completed;
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();

    const payload: Record<string, any> = nextCompleted
      ? { completed: true, actual_food: actualFood || null }
      : { completed: false };

    let saveFailed = false;
    if (logId) {
      const { error } = await saveWithSchemaCacheRetry(
        (p) => supabase.from("diet_logs").update(p).eq("id", logId),
        payload
      );
      saveFailed = !!error;
    } else {
      const insertPayload = { meal_id: mealId, student_id: studentId, date, ...payload };
      const { data, error } = await saveWithSchemaCacheRetry(
        (p) => supabase.from("diet_logs").insert(p).select("id").single(),
        insertPayload
      );
      if (error || !data) {
        saveFailed = true;
      } else {
        setLogId((data as { id: string }).id);
      }
    }

    setSaving(false);

    if (saveFailed) {
      setSaveError("Não foi possível salvar agora. Confere sua internet e tenta de novo.");
      return;
    }

    setCompleted(nextCompleted);
    if (nextCompleted) {
      onOpenChange(false);
      onCompleted?.();
    }
    router.refresh();
  }

  return (
    <StudentCard
      className={`transition-all ${completed ? "bg-gradient-to-br from-orange/5 to-peach/10" : ""}`}
      glow={completed}
    >
      <div className="flex w-full items-center gap-3">
        <button
          type="button"
          onClick={handleToggleComplete}
          disabled={saving}
          aria-label={completed ? "Marcar como não feita" : "Marcar como feita"}
          className="shrink-0 disabled:opacity-50"
        >
          {saving ? (
            <span className="block h-[26px] w-[26px] animate-spin rounded-full border-2 border-lightblue/40 border-t-orange" />
          ) : completed ? (
            <Circle size={26} className="fill-navy text-navy" />
          ) : (
            <Circle size={26} className="text-lightblue" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading font-semibold text-navy">{name}</p>
            {suggestedTime && (
              <p className="flex items-center gap-1 text-sm text-blue">
                <Clock size={12} />
                {suggestedTime}
              </p>
            )}
          </div>
          {open ? (
            <ChevronUp size={18} className="shrink-0 text-blue" />
          ) : (
            <ChevronDown size={18} className="shrink-0 text-blue" />
          )}
        </button>
      </div>

      {saveError && (
        <p className="mt-2 rounded-lg bg-orange/10 px-3 py-2 text-sm text-orange">{saveError}</p>
      )}

      {open && (
        <div className="mt-4 space-y-4 border-t border-lightblue/20 pt-4">
          {description && <p className="text-sm text-navy">{description}</p>}

          {(calories != null || protein != null || carbs != null || fat != null) && (
            <div className="flex flex-wrap gap-2">
              <MacroChip label="" value={calories} unit=" kcal" />
              <MacroChip label="P " value={protein} unit="g" />
              <MacroChip label="C " value={carbs} unit="g" />
              <MacroChip label="G " value={fat} unit="g" />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">
              O que você comeu de verdade? <span className="font-normal text-blue">(opcional)</span>
            </label>
            <textarea
              value={actualFood}
              onChange={(e) => setActualFood(e.target.value)}
              rows={2}
              placeholder="Se comeu diferente do prescrito, anota aqui"
              className="w-full rounded-2xl border border-lightblue/40 px-4 py-2.5 outline-none focus:border-orange"
            />
          </div>

          <p className="pt-1 text-center text-xs text-blue">
            {completed
              ? "Toque na bolinha lá em cima pra desmarcar."
              : "Toque na bolinha lá em cima pra marcar como feita."}
          </p>
        </div>
      )}
    </StudentCard>
  );
}
