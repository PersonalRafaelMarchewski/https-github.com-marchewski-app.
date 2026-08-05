"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { markSessionDone } from "@/app/(trainer)/agenda/actions";

export default function MarkSessionDoneButton({
  sessionId,
  initialDone,
}: {
  sessionId: string;
  initialDone: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(initialDone);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    const next = !done;
    startTransition(async () => {
      try {
        await markSessionDone(sessionId, next);
        setDone(next);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível atualizar.");
      }
    });
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
          done
            ? "border-blue/40 bg-blue/10 text-blue hover:bg-blue/15"
            : "border-lightblue/50 text-navy hover:bg-lightblue/10"
        }`}
      >
        {done ? <RotateCcw size={15} /> : <CheckCircle2 size={15} />}
        {pending ? "Salvando..." : done ? "Feita — desmarcar" : "Marcar como feita"}
      </button>
      {error && (
        <span className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg bg-navy px-2 py-1 text-xs text-white shadow-lg">
          {error}
        </span>
      )}
    </div>
  );
}
