"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { unsnoozeRenewal } from "@/app/(trainer)/renovacoes/actions";

// Traz o cartão de volta pras colunas urgentes antes do prazo do adiamento
// acabar (desiste do "Adiar 7 dias").
export default function UnsnoozeRenewalButton({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await unsnoozeRenewal(studentId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível.");
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
        <RotateCcw size={12} />
        {pending ? "..." : "Trazer de volta"}
      </button>
      {error && (
        <span className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg bg-navy px-2 py-1 text-xs text-white shadow-lg">
          {error}
        </span>
      )}
    </div>
  );
}
