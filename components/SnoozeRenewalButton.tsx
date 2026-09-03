"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock3 } from "lucide-react";
import { snoozeRenewal } from "@/app/(trainer)/renovacoes/actions";

// "Adiar 7 dias": tira o cartão das colunas urgentes por uma semana sem
// precisar renovar a ficha agora — mesma lógica de um cartão adiado no
// Trello. Confirma antes (é fácil clicar sem querer numa lista de cards).
export default function SnoozeRenewalButton({ studentId, studentName }: { studentId: string; studentName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm(`Adiar o alerta de ${studentName} por 7 dias?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await snoozeRenewal(studentId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível adiar.");
      }
    });
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="flex items-center gap-1 rounded-full bg-navy/5 px-2.5 py-1 text-xs font-medium text-navy hover:bg-navy/10 disabled:opacity-50"
      >
        <Clock3 size={12} />
        {pending ? "Adiando..." : "Adiar 7 dias"}
      </button>
      {error && (
        <span className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg bg-navy px-2 py-1 text-xs text-white shadow-lg">
          {error}
        </span>
      )}
    </div>
  );
}
