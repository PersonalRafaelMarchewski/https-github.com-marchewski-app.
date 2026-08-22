"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import Button from "@/components/Button";
import PasswordInput from "@/components/PasswordInput";
import { makeSessionCookiesTabOnly, markSessionAsNotRemembered, NO_REMEMBER_KEY } from "@/lib/rememberMe";
import { checkLoginAllowed, reportFailedLogin, checkPasswordResetAllowed } from "@/app/login/actions";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // checa ANTES de tentar — login certo não consome cota, só entra na
      // conta quando a senha estiver errada (ver reportFailedLogin abaixo)
      const rateLimit = await checkLoginAllowed();
      if (!rateLimit.allowed) {
        setError(
          `Muitas tentativas seguidas deste local. Espere cerca de ${rateLimit.retryAfterMinutes} minutos e tente de novo.`
        );
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        await reportFailedLogin();
        setError("E-mail ou senha inválidos.");
        setLoading(false);
        return;
      }

      // por padrão a sessão já fica salva por bastante tempo; se
      // desmarcou "manter conectado", vira uma sessão só dessa aba —
      // some sozinha quando fechar o navegador de vez. O SDK regrava o
      // cookie original (validade longa) sozinho em vários momentos, daí
      // o RememberMeGuard (montado no layout raiz) ficar reaplicando o
      // rebaixamento enquanto essa marca estiver ativa nessa aba.
      if (rememberMe) {
        sessionStorage.removeItem(NO_REMEMBER_KEY);
      } else {
        markSessionAsNotRemembered();
        makeSessionCookiesTabOnly();
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      router.push(profile?.role === "student" ? "/treino-do-dia" : "/dashboard");
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
      const rateLimit = await checkPasswordResetAllowed();
      if (!rateLimit.allowed) {
        setError(
          `Muitos pedidos seguidos deste local. Espere cerca de ${rateLimit.retryAfterMinutes} minutos e tente de novo.`
        );
        setLoading(false);
        return;
      }

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-navy via-navy to-blue px-4">
      {/* mesmo glow decorativo do header logado — a primeira tela que
          alguém vê já entra na mesma linguagem visual do resto do app */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-orange/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-peach/15 blur-3xl"
      />

      <div className="relative w-full max-w-sm md:max-w-2xl">
        <div className="mb-8 flex justify-center md:mb-10">
          <Image
            src="/logo-negativo.png"
            alt="Marchewski Assessoria Esportiva"
            width={288}
            height={160}
            priority
            unoptimized
            className="h-auto w-72 md:w-96"
          />
        </div>

        {mode === "login" ? (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl bg-white p-6 shadow-[0_24px_60px_-20px_rgba(10,13,40,0.55)] md:rounded-3xl md:p-10"
          >
            <h1 className="mb-6 text-center text-xl font-bold text-navy md:mb-8 md:text-3xl">Entrar</h1>

            <label className="mb-1 block text-sm font-medium text-navy md:mb-2 md:text-base">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange md:mb-5 md:rounded-xl md:px-4 md:py-3 md:text-lg"
              placeholder="voce@email.com"
            />

            <label className="mb-1 block text-sm font-medium text-navy md:mb-2 md:text-base">Senha</label>
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-2 rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange md:rounded-xl md:px-4 md:py-3 md:pr-12 md:text-lg"
              placeholder="••••••••"
            />

            <label className="mb-4 flex items-center gap-2 text-sm text-navy md:mb-5 md:gap-3 md:text-base">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-lightblue/50 accent-orange md:h-5 md:w-5"
              />
              Manter conectado
            </label>

            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(null);
              }}
              className="mb-4 block text-sm text-blue hover:underline md:mb-5 md:text-base"
            >
              Esqueci minha senha
            </button>

            {error && <p className="mb-4 text-sm text-orange md:text-base">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full md:py-3.5 md:text-lg">
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        ) : (
          <div className="rounded-2xl bg-white p-6 shadow-[0_24px_60px_-20px_rgba(10,13,40,0.55)] md:rounded-3xl md:p-10">
            <h1 className="mb-2 text-center text-xl font-bold text-navy md:text-3xl">
              Redefinir senha
            </h1>

            {recoverySent ? (
              <>
                <p className="mb-6 text-center text-sm text-blue md:text-base">
                  Se esse e-mail estiver cadastrado, você vai receber um link pra
                  criar uma nova senha em instantes. Confira também a caixa de spam.
                </p>
                <Button type="button" onClick={backToLogin} className="w-full md:py-3.5 md:text-lg">
                  Voltar pro login
                </Button>
              </>
            ) : (
              <form onSubmit={handleForgotSubmit}>
                <p className="mb-4 text-center text-sm text-blue md:text-base">
                  Digite o e-mail cadastrado — vamos te mandar um link pra criar uma
                  senha nova.
                </p>

                <label className="mb-1 block text-sm font-medium text-navy md:mb-2 md:text-base">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mb-4 w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange md:mb-5 md:rounded-xl md:px-4 md:py-3 md:text-lg"
                  placeholder="voce@email.com"
                />

                {error && <p className="mb-4 text-sm text-orange md:text-base">{error}</p>}

                <Button type="submit" disabled={loading} className="w-full md:py-3.5 md:text-lg">
                  {loading ? "Enviando..." : "Enviar link de recuperação"}
                </Button>

                <button
                  type="button"
                  onClick={backToLogin}
                  className="mt-3 block w-full text-center text-sm text-blue hover:underline md:mt-4 md:text-base"
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
