import Image from "next/image";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import TrainerNav from "@/components/TrainerNav";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-lightblue/10">
      <header className="flex items-center justify-between bg-navy px-6 py-4">
        <Image src="/logo-negativo.png" alt="Marchewski" width={101} height={56} unoptimized />
        <div className="flex items-center gap-4">
          <Link
            href="/conta"
            className="flex items-center gap-2 text-sm text-white/80 hover:text-white"
          >
            <KeyRound size={16} />
            Alterar senha
          </Link>
          <SignOutButton />
        </div>
      </header>
      <TrainerNav />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
