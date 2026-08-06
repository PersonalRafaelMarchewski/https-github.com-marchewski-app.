"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import Button from "@/components/Button";
import AccessCredentialsCard from "@/components/AccessCredentialsCard";
import { resetStudentPassword } from "@/app/(trainer)/alunos/[id]/actions";

export default function ResetPasswordButton({
  studentId,
  studentEmail,
}: {
  studentId: string;
  studentEmail: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);

    const result = await resetStudentPassword(studentId);

    setPending(false);

    if (result.error || !result.password) {
      setError(result.error ?? "Não foi possível resetar a senha.");
      return;
    }

    setNewPassword(result.password);
  }

  if (newPassword) {
    return (
      <AccessCredentialsCard
        email={studentEmail}
        password={newPassword}
        title="Nova senha temporária — compartilhe esse acesso com o aluno:"
      />
    );
  }

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        onClick={handleClick}
        disabled={pending}
        className="flex items-center gap-2 !px-3 !py-1.5 text-sm"
      >
        <KeyRound size={16} />
        {pending ? "Resetando..." : "Resetar senha"}
      </Button>
      {error && <p className="mt-1 text-sm text-orange">{error}</p>}
    </div>
  );
}
