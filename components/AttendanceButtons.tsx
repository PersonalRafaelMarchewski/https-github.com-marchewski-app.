"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { setSessionStatus, setMissedReason } from "@/app/(trainer)/agenda/actions";

const GREEN = "#0b8043";
const RED = "#d60000";

// Presença da aula na tela do evento: Presente (verde) ou Falta (vermelho).
// Clicar no botão que já está ativo desfaz (volta pra "marcada"). Marcar
// falta abre um campo pra anotar o motivo (opcional) — some sozinho se a
// aula deixar de ser falta.
export default function AttendanceButtons({
  sessionId,
  initialStatus,
  initialReason,
}: {
  sessionId: string;
  initialStatus: string;
  initialReason?: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [reason, setReason] = useState(initialReason ?? "");
  const [pending, startTransition] = useTransition();
  const [savingReason, startReasonTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick(target: "done" | "missed") {
    setError(null);
    const next = status === target ? "scheduled" : target;
    startTransition(async () => {
      try {
        await setSessionStatus(sessionId, next, next === "missed" ? reason : null);
        setStatus(next);
        if (next !== "missed") setReason("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível atualizar.");
      }
    });
  }

  function handleReasonBlur() {
    if (status !== "missed") return;
    setError(null);
    startReasonTransition(async () => {
      try {
        await setMissedReason(sessionId, reason);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível salvar o motivo.");
      }
    });
  }

  const base =
    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50";

  return (
    <div className="relative">
      <div className="inline-flex gap-2">
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
      </div>

      {status === "missed" && (
        <div className="mt-2">
          <label className="mb-1 block text-xs font-medium text-navy">
            Motivo da falta <span className="font-normal text-blue">(opcional)</span>
          </label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={handleReasonBlur}
            placeholder="Ex: viagem, imprevisto no trabalho, doente..."
            className="w-full max-w-xs rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
          />
          {savingReason && <p className="mt-1 text-xs text-blue">Salvando...</p>}
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs font-medium text-orange">{error}</p>
      )}
    </div>
  );
}
