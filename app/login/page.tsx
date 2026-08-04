"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import Button from "@/components/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-white p-6 shadow-lg"
        >
          <h1 className="mb-6 text-center text-xl font-bold text-navy">
            Entrar
          </h1>

          <label className="mb-1 block text-sm font-medium text-navy">
            E-mail
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            placeholder="voce@email.com"
          />

          <label className="mb-1 block text-sm font-medium text-navy">
            Senha
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            placeholder="••••••••"
          />

          {error && <p className="mb-4 text-sm text-orange">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </main>
  );
}
