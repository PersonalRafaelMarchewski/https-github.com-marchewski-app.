"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { setSessionStatus } from "@/app/(trainer)/agenda/actions";

const GREEN = "#0b8043";
const RED = "#d60000";

// Presença da aula na tela do evento: Presente (verde) ou Falta (vermelho).
// Clicar no botão que já está ativo desfaz (volta pra "marcada").
export default function AttendanceButtons({
  sessionId,
  initialStatus,
}: {
  sessionId: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick(target: "done" | "missed") {
    setError(null);
    const next = status === target ? "scheduled" : target;
    startTransition(async () => {
      try {
        await setSessionStatus(sessionId, next);
        setStatus(next);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível atualizar.");
      }
    });
  }

  const base =
    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50";

  return (
    <div className="relative inline-flex gap-2">
      <button
        type="button"
        onClick={() => handleClick("done")}
        disabled={pending}
        className={base}
        style={
          status === "done"
            ? { backgroundColor: GREEN, borderColor: GREEN, color: "#fff" }
            : { borderColor: "rgba(11,128,67,0.45)", color: GREEN }
        }
      >
        <CheckCircle2 size={15} />
        {pending ? "..." : "Presente"}
      </button>
      <button
        type="button"
        onClick={() => handleClick("missed")}
        disabled={pending}
        className={base}
        style={
          status === "missed"
            ? { backgroundColor: RED, borderColor: RED, color: "#fff" }
            : { borderColor: "rgba(214,0,0,0.4)", color: RED }
        }
      >
        <XCircle size={15} />
        {pending ? "..." : "Falta"}
      </button>
      {error && (
        <span className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg bg-navy px-2 py-1 text-xs text-white shadow-lg">
          {error}
        </span>
      )}
    </div>
  );
}
