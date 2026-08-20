"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import Card from "@/components/Card";
import Button from "@/components/Button";
import PasswordInput from "@/components/PasswordInput";
import { clearMustChangePassword } from "@/app/trocar-senha/actions";

// Igual ao ChangePasswordForm da tela de perfil, mas pro primeiro login:
// não tem "senha alterada com sucesso" e sim redirecionamento pro app,
// porque o usuário está bloqueado nesta tela até concluir.
export default function FirstLoginPasswordForm({ redirectTo }: { redirectTo: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message || "Não foi possível salvar a senha. Tente de novo.");
        setSaving(false);
        return;
      }

      await clearMustChangePassword();

      // navegação "dura" de propósito, não router.push: trocar a senha faz o
      // Supabase emitir tokens novos, e a navegação suave do Next chega ao
      // servidor com o cookie antigo — o layout então mandava de volta pra
      // cá e o aluno ficava preso na tela mesmo com tudo já salvo. O
      // "Salvando..." fica no ar até a página nova carregar, de propósito.
      window.location.assign(redirectTo);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar a senha. Verifique sua conexão e tente de novo."
      );
      setSaving(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Nova senha</label>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            placeholder="Pelo menos 6 caracteres"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Confirme a nova senha</label>
          <PasswordInput
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            placeholder="Digite de novo"
          />
        </div>

        {error && <p className="text-sm text-orange">{error}</p>}

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Salvando..." : "Salvar e continuar"}
        </Button>
      </form>
    </Card>
  );
}
