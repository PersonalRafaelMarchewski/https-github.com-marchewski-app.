"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteSession, deleteFutureSessions } from "@/app/(trainer)/agenda/actions";

export default function DeleteSessionButton({
  sessionId,
  isRecurring,
}: {
  sessionId: string;
  isRecurring: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function runDelete(action: () => Promise<void>, confirmMessage: string) {
    if (!confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.push("/agenda");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível excluir.");
      }
    });
  }

  if (!isRecurring) {
    return (
      <div className="relative inline-flex">
        <button
          type="button"
          onClick={() =>
            runDelete(
              () => deleteSession(sessionId),
              "Excluir esta aula? Essa ação não pode ser desfeita."
            )
          }
          disabled={pending}
          className="rounded-lg p-1.5 text-orange hover:bg-orange/10 disabled:opacity-50"
          aria-label="Excluir"
        >
          <Trash2 size={16} />
        </button>
        {error && (
          <span className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg bg-navy px-2 py-1 text-xs text-white shadow-lg">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() =>
          runDelete(
            () => deleteSession(sessionId),
            "Excluir só esta aula (as outras da série continuam)? Essa ação não pode ser desfeita."
          )
        }
        disabled={pending}
        className="rounded-lg border border-lightblue/50 px-3 py-1.5 text-sm font-medium text-navy hover:bg-lightblue/10 disabled:opacity-50"
      >
        Excluir só esta
      </button>
      <button
        type="button"
        onClick={() =>
          runDelete(
            () => deleteFutureSessions(sessionId),
            "Excluir esta aula e todas as futuras dessa série recorrente? Essa ação não pode ser desfeita."
          )
        }
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg bg-orange/10 px-3 py-1.5 text-sm font-medium text-orange hover:bg-orange/20 disabled:opacity-50"
      >
        <Trash2 size={15} />
        Excluir esta e as futuras
      </button>
      {error && (
        <span className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg bg-navy px-2 py-1 text-xs text-white shadow-lg">
          {error}
        </span>
      )}
    </div>
  );
}
