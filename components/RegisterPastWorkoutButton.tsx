"use client";

import { useState } from "react";
import { CalendarPlus, Check } from "lucide-react";
import { registerPastWorkout } from "@/app/(trainer)/alunos/[id]/actions";

type FichaOption = { workoutId: string; label: string; name: string };

// Registrar um treino executado num dia que já passou — pro aluno que
// treinou mas esqueceu de marcar (ou treinou fora do app). Só existe do
// lado do personal, por decisão do Rafa (aluno com retroativo poderia
// maquiar a própria frequência). O registro fica com a nota "Registrado
// depois pelo personal" nos logs.
export default function RegisterPastWorkoutButton({
  studentId,
  fichas,
  maxDate,
}: {
  studentId: string;
  fichas: FichaOption[];
  maxDate: string; // hoje (YYYY-MM-DD) — não registra futuro
}) {
  const [open, setOpen] = useState(false);
  const [fichaKey, setFichaKey] = useState(fichas[0] ? `${fichas[0].workoutId}|${fichas[0].label}` : "");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (fichas.length === 0) return null;

  async function handleSave() {
    const [workoutId, label] = fichaKey.split("|");
    if (!workoutId || !date) {
      setError("Escolhe a ficha e a data.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await registerPastWorkout(studentId, workoutId, label, date);
      setDone(date);
      setOpen(false);
      setDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setDone(null);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-lightblue/50 px-2.5 py-1 text-xs font-medium text-blue hover:bg-lightblue/20"
        >
          <CalendarPlus size={14} />
          Registrar treino passado
        </button>
        {done && (
          <span className="flex items-center gap-1 text-xs font-medium text-navy">
            <Check size={13} strokeWidth={3} className="text-orange" />
            registrado em {done.split("-").reverse().join("/")}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <select
        value={fichaKey}
        onChange={(e) => setFichaKey(e.target.value)}
        className="rounded-lg border border-lightblue/50 px-2 py-1 text-xs outline-none focus:border-orange"
      >
        {fichas.map((f) => (
          <option key={`${f.workoutId}|${f.label}`} value={`${f.workoutId}|${f.label}`}>
            {f.name}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={date}
        max={maxDate}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-lg border border-lightblue/50 px-2 py-1 text-xs outline-none focus:border-orange"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-navy px-2.5 py-1 text-xs font-medium text-white hover:bg-blue disabled:opacity-50"
      >
        {saving ? "..." : "Registrar"}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="text-xs text-blue hover:underline"
      >
        Cancelar
      </button>
      {error && <span className="w-full text-xs text-orange">{error}</span>}
    </span>
  );
}
