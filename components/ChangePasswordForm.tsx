"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import Card from "@/components/Card";
import Button from "@/components/Button";
import PasswordInput from "@/components/PasswordInput";
import { validatePassword, MIN_PASSWORD_LENGTH, PASSWORD_HINT } from "@/lib/passwordPolicy";

export default function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const validationError = validatePassword(password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message || "Não foi possível alterar a senha. Tente novamente.");
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch {
      // rede instável, sessão expirada etc — sem isso o botão ficava preso
      // em "Salvando..." pra sempre, sem avisar o aluno que algo deu errado
      setError("Não foi possível alterar a senha. Verifique sua conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Nova senha</label>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            className="rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Confirmar nova senha</label>
          <PasswordInput
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            className="rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        {error && <p className="text-sm text-orange">{error}</p>}
        {success && <p className="text-sm text-navy">Senha alterada com sucesso.</p>}

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Salvando..." : "Alterar senha"}
        </Button>
      </form>
    </Card>
  );
}
