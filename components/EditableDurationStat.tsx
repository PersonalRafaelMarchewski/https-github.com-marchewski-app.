"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import StudentCard from "@/components/student/StudentCard";
import { saveWorkoutDuration } from "@/app/(student)/treino-do-dia/finish";

// O card de minutos do resumo "Treino concluído", agora corrigível: o
// tempo calculado (primeiro→último exercício marcado) erra quando o aluno
// marca tudo de uma vez no fim (2 min) ou deixa o app aberto (3h). O
// lápis abre um campo pra corrigir; o valor salvo fica na sessão e vale
// também pra conquista "Dentro do tempo" (a página recarrega ao salvar).
export default function EditableDurationStat({
  minutes,
  workoutId,
  label,
  sessionDate,
}: {
  minutes: number | null;
  workoutId: string;
  label: string;
  sessionDate: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(minutes != null ? String(minutes) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function handleSave() {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 600) {
      setError(true);
      return;
    }
    setSaving(true);
    setError(false);
    try {
      await saveWorkoutDuration(workoutId, label, sessionDate, parsed);
      setEditing(false);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <StudentCard className="relative">
      {editing ? (
        <>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={600}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={`w-full rounded-lg border px-1 py-0.5 text-center text-2xl font-bold text-navy outline-none ${
              error ? "border-orange" : "border-lightblue/50 focus:border-orange"
            }`}
          />
          <div className="mt-1 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              aria-label="Salvar tempo"
              className="text-orange disabled:opacity-50"
            >
              <Check size={16} strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(false);
                setValue(minutes != null ? String(minutes) : "");
              }}
              aria-label="Cancelar"
              className="text-blue"
            >
              <X size={16} />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-2xl font-bold text-navy">{minutes ?? "-"}</p>
          <p className="text-xs text-blue">minutos</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Corrigir o tempo do treino"
            className="absolute right-2 top-2 text-lightblue hover:text-blue"
          >
            <Pencil size={13} />
          </button>
        </>
      )}
    </StudentCard>
  );
}
