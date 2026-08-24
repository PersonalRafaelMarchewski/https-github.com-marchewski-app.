import Image from "next/image";
import Link from "next/link";
import { getAuthUser, getAuthProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TrainerNav from "@/components/TrainerNav";
import NotificationNudge from "@/components/NotificationNudge";
import OfflineSyncRunner from "@/components/OfflineSyncRunner";
import TrainerAccountMenu from "@/components/TrainerAccountMenu";
import PullToRefresh from "@/components/PullToRefresh";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) redirect("/login");

  // aluno que caia numa rota do personal (link antigo, URL digitada) volta
  // pra própria área — o RLS já entregaria tela vazia, mas isso é a
  // barreira de código que não depende de nenhuma policy estar correta
  const { role, mustChangePassword } = await getAuthProfile();
  if (role === "student") redirect("/treino-do-dia");
  if (mustChangePassword) redirect("/trocar-senha");

  return (
    <div className="min-h-screen bg-lightblue/10">
      {/* Mesmo tratamento visual do header do aluno (gradiente + glow +
          cantos arredondados) — antes era um navy chapado sem profundidade;
          aqui fica mais simples (sem linha de perfil) porque o personal já
          vê os alunos logo abaixo, não precisa repetir o próprio cadastro. */}
      <header className="relative rounded-b-[28px] bg-gradient-to-br from-navy via-navy to-blue px-6 py-4 shadow-[0_12px_32px_-12px_rgba(31,37,86,0.45)]">
        {/* overflow-hidden só nessa camada decorativa — se fosse no <header>
            inteiro, cortava também o menu da engrenagem, que "vaza" pra
            fora dele via position:absolute (bug real que isso já causou) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-[28px]">
          <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-orange/25 blur-3xl" />
        </div>
        <div className="relative flex items-center justify-between">
          <Link href="/dashboard" aria-label="Voltar para o início">
            <Image src="/logo-negativo.png" alt="Marchewski" width={101} height={56} unoptimized />
          </Link>
          <TrainerAccountMenu />
        </div>
      </header>
      <TrainerNav />
      <NotificationNudge />
      <OfflineSyncRunner />
      <PullToRefresh>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </PullToRefresh>
    </div>
  );
}
