"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserX, UserCheck } from "lucide-react";
import { toggleStudentStatus } from "@/app/(trainer)/alunos/[id]/actions";

export default function ToggleStudentStatusButton({
  studentId,
  studentName,
  status,
}: {
  studentId: string;
  studentName: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isActive = status === "active";

  function handleClick() {
    const confirmed = confirm(
      isActive
        ? `Marcar "${studentName}" como inativo?\n\nEle some da lista de ativos e perde o acesso às ações de treino do dia (treinar agora, plano semanal). O cadastro, histórico e dados continuam intactos — pode reativar quando quiser.`
        : `Marcar "${studentName}" como ativo de novo?`
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await toggleStudentStatus(studentId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível alterar o status.");
      }
    });
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="flex min-h-[44px] items-center gap-2 rounded-lg px-4 text-sm font-medium text-blue hover:bg-lightblue/15 disabled:opacity-50"
      >
        {isActive ? <UserX size={16} /> : <UserCheck size={16} />}
        {pending ? "Salvando..." : isActive ? "Marcar inativo" : "Marcar ativo"}
      </button>
      {error && (
        <span className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg bg-navy px-2 py-1 text-xs text-white shadow-lg">
          {error}
        </span>
      )}
    </div>
  );
}
