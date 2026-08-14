"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import Button from "@/components/Button";
import PasswordInput from "@/components/PasswordInput";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // o link do e-mail traz o token de recuperação na própria URL — o
    // client do Supabase lê isso sozinho ao carregar e cria uma sessão
    // temporária. O problema: esse processamento é assíncrono, e um
    // getSession() único, disparado antes dele terminar, podia voltar
    // vazio mesmo com o link válido — a tela ficava presa em
    // "Carregando..." pra sempre, sem avisar nada (bug reportado pelo
    // Rafa: "não sabemos se redefiniu a senha").
    //
    // Fix: escuta o evento PASSWORD_RECOVERY (o sinal oficial de que o
    // Supabase terminou de processar o token do link) + getSession()
    // como reforço + um timeout de segurança, pra nunca mais ficar
    // "carregando" sem fim — depois de alguns segundos sem sessão,
    // assume link inválido/expirado e mostra a tela de erro.
    const supabase = createClient();
    let settled = false;

    function markReady(has: boolean) {
      if (settled) return;
      settled = true;
      setHasSession(has);
      setReady(true);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        markReady(Boolean(session));
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady(true);
    });

    const timeout = setTimeout(() => markReady(false), 4000);

    return () => {
      authListener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

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
        setError(updateError.message || "Não foi possível salvar a nova senha.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch {
      setError("Não foi possível salvar a nova senha. Verifique sua conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo-negativo.png"
            alt="Marchewski Assessoria Esportiva"
            width={288}
            height={160}
            priority
            unoptimized
          />
        </div>

        <div className="rounded-xl bg-white p-6 shadow-lg">
          {!ready ? (
            <p className="text-center text-sm text-blue">Carregando...</p>
          ) : !hasSession ? (
            <>
              <h1 className="mb-2 text-center text-xl font-bold text-navy">
                Link inválido ou expirado
              </h1>
              <p className="mb-6 text-center text-sm text-blue">
                Esse link de redefinição de senha não é mais válido. Volte pro login
                e peça um novo.
              </p>
              <Button type="button" onClick={() => router.push("/login")} className="w-full">
                Voltar pro login
              </Button>
            </>
          ) : success ? (
            <>
              <h1 className="mb-2 text-center text-xl font-bold text-navy">
                Senha alterada!
              </h1>
              <p className="text-center text-sm text-blue">
                Redirecionando pro login...
              </p>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <h1 className="mb-6 text-center text-xl font-bold text-navy">
                Crie sua nova senha
              </h1>

              <label className="mb-1 block text-sm font-medium text-navy">Nova senha</label>
              <PasswordInput
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mb-4 rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
                placeholder="••••••••"
              />

              <label className="mb-1 block text-sm font-medium text-navy">
                Confirmar nova senha
              </label>
              <PasswordInput
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mb-4 rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
                placeholder="••••••••"
              />

              {error && <p className="mb-4 text-sm text-orange">{error}</p>}

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
