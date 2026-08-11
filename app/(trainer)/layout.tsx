import Image from "next/image";
import Link from "next/link";
import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TrainerNav from "@/components/TrainerNav";
import TrainerAccountMenu from "@/components/TrainerAccountMenu";
import PullToRefresh from "@/components/PullToRefresh";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-lightblue/10">
      <header className="flex items-center justify-between bg-navy px-6 py-4">
        <Link href="/dashboard" aria-label="Voltar para o início">
          <Image src="/logo-negativo.png" alt="Marchewski" width={101} height={56} unoptimized />
        </Link>
        <TrainerAccountMenu />
      </header>
      <TrainerNav />
      <PullToRefresh>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </PullToRefresh>
    </div>
  );
}
