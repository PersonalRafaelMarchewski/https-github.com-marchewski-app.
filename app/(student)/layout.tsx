import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import StudentNav from "@/components/StudentNav";
import NotificationButton from "@/components/NotificationButton";

export default async function StudentLayout({
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
          <NotificationButton />
          <SignOutButton />
        </div>
      </header>
      <StudentNav />
      <main className="mx-auto max-w-2xl px-6 py-8">{children}</main>
    </div>
  );
}
