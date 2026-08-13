import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StudentNav from "@/components/StudentNav";
import StudentAccountMenu from "@/components/StudentAccountMenu";
import PullToRefresh from "@/components/PullToRefresh";
import WhatsAppButton from "@/components/WhatsAppButton";
import { getSignedAvatarUrl } from "@/lib/avatar";
import { levelLabel } from "@/lib/level";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("level, profiles:profile_id (name, email, avatar_url)")
    .eq("profile_id", user.id)
    .single();

  const profile = (student as any)?.profiles;
  const avatarSignedUrl = await getSignedAvatarUrl(profile?.avatar_url);

  return (
    <div className="min-h-screen bg-lightblue/10">
      <header className="flex items-center justify-between bg-navy px-6 py-4">
        <Link href="/treino-do-dia" aria-label="Voltar para o início">
          <Image src="/logo-negativo.png" alt="Marchewski" width={101} height={56} unoptimized />
        </Link>
        <StudentAccountMenu />
      </header>

      <Link
        href="/perfil"
        className="flex items-center gap-4 border-b border-lightblue/20 bg-white px-6 py-5"
      >
        <span className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-full bg-peach/40 text-navy">
          {avatarSignedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarSignedUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <User size={28} />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate font-heading text-lg font-bold text-navy">
            {profile?.name ?? "Perfil"}
          </p>
          {profile?.email && <p className="truncate text-sm text-blue">{profile.email}</p>}
          <span className="mt-1 inline-block rounded-full bg-lightblue/15 px-2.5 py-0.5 text-xs font-medium text-blue">
            {levelLabel((student as any)?.level)}
          </span>
        </div>
      </Link>

      <StudentNav />
      <PullToRefresh>
        {/* pb-24 (bem mais que os 56px+20px do botão do WhatsApp) — sem
            isso o botão flutuante fica em cima do final da página, e em
            telas com um botão cheio no rodapé (ex: "Salvar anamnese") ele
            literalmente tampa parte do botão real */}
        <main className="mx-auto max-w-2xl px-6 py-8 pb-24">{children}</main>
      </PullToRefresh>
      <WhatsAppButton />
    </div>
  );
}
