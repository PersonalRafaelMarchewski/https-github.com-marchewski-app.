"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderDown } from "lucide-react";
import { createClient } from "@/lib/supabase";

export type TemplateRow = {
  key: string;
  exercise_id: string;
  label: string;
  sets: string;
  reps: string;
  load: string;
  rest_seconds: string;
  method: string;
};

type Template = { id: string; name: string };

// Carrega os exercícios de um modelo salvo e devolve prontos pra entrar
// no formulário — mesmo formato de linha que o form já usa (Row), só que
// aqui chamamos de TemplateRow pra não depender do tipo interno do form.
export default function WorkoutTemplatePicker({
  templates,
  onApply,
}: {
  templates: Template[];
  onApply: (rows: TemplateRow[]) => void;
}) {
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (templates.length === 0) return null;

  async function handleApply() {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("workout_template_exercises")
      .select("exercise_id, label, sets, reps, load, rest_seconds, method")
      .eq("template_id", selectedId)
      .order("order_index");

    setLoading(false);
    if (fetchError || !data) {
      setError("Não foi possível carregar esse modelo. Tenta de novo.");
      return;
    }

    onApply(
      data.map((r) => ({
        key: crypto.randomUUID(),
        exercise_id: r.exercise_id,
        label: r.label,
        sets: r.sets?.toString() ?? "",
        reps: r.reps ?? "",
        load: r.load ?? "",
        rest_seconds: r.rest_seconds?.toString() ?? "",
        method: r.method ?? "",
      }))
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-lightblue/40 bg-lightblue/5 p-3">
      <div className="min-w-[160px] flex-1">
        <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-navy">
          <FolderDown size={14} className="text-orange" />
          Usar modelo pronto
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleApply}
        disabled={loading}
        className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
      >
        {loading ? "Carregando..." : "Aplicar"}
      </button>
      <Link href="/modelos-treino" className="text-xs text-blue hover:underline">
        gerenciar modelos
      </Link>
      {error && <p className="w-full text-xs text-orange">{error}</p>}
    </div>
  );
}
