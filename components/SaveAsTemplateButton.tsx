"use client";

import { useState } from "react";
import { BookmarkPlus, Check } from "lucide-react";
import { saveWorkoutAsTemplate } from "@/app/(trainer)/modelos-treino/actions";

// "Salvar como modelo" na edição de um treino já montado: vira um modelo
// reutilizável em Modelos de treino / no seletor do treino novo. Irmão do
// botão que já existia na criação (NovoTreinoForm) — mesma experiência:
// clica, dá um nome (já vem sugerido), salva.
export default function SaveAsTemplateButton({
  workoutId,
  defaultName,
}: {
  workoutId: string;
  defaultName: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveWorkoutAsTemplate(workoutId, name);
      setSaved(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o modelo.");
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <span className="flex items-center justify-center gap-1.5 rounded-lg border border-lightblue/50 px-3 py-1.5 text-sm font-medium text-navy">
        <Check size={16} className="text-orange" />
        Modelo salvo
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-lightblue/50 px-3 py-1.5 text-sm font-medium text-navy hover:bg-lightblue/10"
      >
        <BookmarkPlus size={16} />
        Salvar como modelo
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do modelo"
        autoFocus
        className="w-44 rounded-lg border border-lightblue/50 px-3 py-1.5 text-sm outline-none focus:border-orange"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-blue disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar"}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="text-sm text-blue hover:underline"
      >
        Cancelar
      </button>
      {error && <span className="w-full text-xs text-orange">{error}</span>}
    </span>
  );
}
