import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";

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
        <SignOutButton />
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
