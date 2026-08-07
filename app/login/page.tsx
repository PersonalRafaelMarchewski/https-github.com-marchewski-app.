"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import Button from "@/components/Button";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("E-mail ou senha inválidos.");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      router.push(profile?.role === "student" ? "/treino-do-dia" : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? `Erro ao entrar: ${err.message}`
          : "Erro inesperado ao entrar. Tenta de novo."
      );
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      // NEXT_PUBLIC_* precisa ficar escrito literalmente aqui (ver lib/supabase.ts)
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || window.location.origin;

      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/redefinir-senha`,
      });

      // Sempre mostra a mesma mensagem, exista ou não esse e-mail na base —
      // evita confirmar pra quem não deveria se um e-mail está cadastrado.
      setRecoverySent(true);
    } catch {
      setError("Não foi possível enviar o e-mail agora. Tenta de novo em instantes.");
    } finally {
      setLoading(false);
    }
  }

  function backToLogin() {
    setMode("login");
    setError(null);
    setRecoverySent(false);
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

        {mode === "login" ? (
          <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-lg">
            <h1 className="mb-6 text-center text-xl font-bold text-navy">Entrar</h1>

            <label className="mb-1 block text-sm font-medium text-navy">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              placeholder="voce@email.com"
            />

            <label className="mb-1 block text-sm font-medium text-navy">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-2 w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              placeholder="••••••••"
            />

            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(null);
              }}
              className="mb-4 block text-sm text-blue hover:underline"
            >
              Esqueci minha senha
            </button>

            {error && <p className="mb-4 text-sm text-orange">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        ) : (
          <div className="rounded-xl bg-white p-6 shadow-lg">
            <h1 className="mb-2 text-center text-xl font-bold text-navy">
              Redefinir senha
            </h1>

            {recoverySent ? (
              <>
                <p className="mb-6 text-center text-sm text-blue">
                  Se esse e-mail estiver cadastrado, você vai receber um link pra
                  criar uma nova senha em instantes. Confira também a caixa de spam.
                </p>
                <Button type="button" onClick={backToLogin} className="w-full">
                  Voltar pro login
                </Button>
              </>
            ) : (
              <form onSubmit={handleForgotSubmit}>
                <p className="mb-4 text-center text-sm text-blue">
                  Digite o e-mail cadastrado — vamos te mandar um link pra criar uma
                  senha nova.
                </p>

                <label className="mb-1 block text-sm font-medium text-navy">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mb-4 w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
                  placeholder="voce@email.com"
                />

                {error && <p className="mb-4 text-sm text-orange">{error}</p>}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Enviando..." : "Enviar link de recuperação"}
                </Button>

                <button
                  type="button"
                  onClick={backToLogin}
                  className="mt-3 block w-full text-center text-sm text-blue hover:underline"
                >
                  Voltar pro login
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
