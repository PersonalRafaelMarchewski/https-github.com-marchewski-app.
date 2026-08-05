"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteStudent } from "@/app/(trainer)/alunos/[id]/actions";

export default function DeleteStudentButton({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const confirmed = confirm(
      `Excluir "${studentName}" definitivamente?\n\n` +
        "Isso apaga TODOS os dados do aluno: treinos, avaliações (com fotos), " +
        "vídeos de exercício, aulas na agenda, pagamentos e o acesso de login. " +
        "Essa ação não pode ser desfeita."
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await deleteStudent(studentId);
        router.push("/dashboard");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível excluir o aluno.");
      }
    });
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-orange hover:bg-orange/10 disabled:opacity-50"
      >
        <Trash2 size={16} />
        {pending ? "Excluindo..." : "Excluir aluno"}
      </button>
      {error && (
        <span className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg bg-navy px-2 py-1 text-xs text-white shadow-lg">
          {error}
        </span>
      )}
    </div>
  );
}
