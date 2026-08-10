"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createWorkoutLabel } from "@/app/(trainer)/treinos/[id]/label-actions";

export default function NewBlockButton({ workoutId }: { workoutId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    if (!name.trim()) {
      setError("Dê um nome pro bloco.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createWorkoutLabel(workoutId, name.trim());
        setName("");
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao criar.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-blue hover:text-navy"
      >
        <Plus size={14} />
        Novo bloco
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-lightblue/50 p-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        placeholder="Nome do bloco (ex: Peito e Tríceps)"
        className="min-w-0 flex-1 rounded-lg border border-lightblue/50 px-3 py-1.5 text-sm outline-none focus:border-orange"
      />
      <button
        type="button"
        onClick={handleCreate}
        disabled={pending}
        className="rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-blue disabled:opacity-50"
      >
        {pending ? "..." : "Criar"}
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
      {error && <p className="w-full text-xs text-orange">{error}</p>}
    </div>
  );
}
