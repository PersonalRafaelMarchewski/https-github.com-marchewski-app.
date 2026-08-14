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
      {/* Hero navy: logo/menu + perfil num bloco só, com um glow decorativo
          sutil — antes eram duas faixas planas (navy + branca) separadas
          por uma linha seca, o que lia como duas telas coladas em vez de
          uma peça só. */}
      <header className="relative rounded-b-[32px] bg-gradient-to-br from-navy via-navy to-blue px-6 pb-6 pt-4 shadow-[0_12px_32px_-12px_rgba(31,37,86,0.45)]">
        {/* overflow-hidden só nessa camada decorativa — se fosse no
            <header> inteiro, cortava também o menu da engrenagem, que
            "vaza" pra fora dele via position:absolute (bug real que isso
            já causou em produção) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-[32px]">
          <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-orange/25 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-peach/20 blur-3xl" />
        </div>

        <div className="relative flex items-center justify-between">
          <Link href="/treino-do-dia" aria-label="Voltar para o início">
            <Image src="/logo-negativo.png" alt="Marchewski" width={101} height={56} unoptimized />
          </Link>
          <StudentAccountMenu />
        </div>

        <Link href="/perfil" className="relative mt-5 flex items-center gap-4">
          <span className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-full bg-peach/30 text-white ring-2 ring-white/20">
            {avatarSignedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSignedUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <User size={28} />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-heading text-lg font-bold text-white">
              {profile?.name ?? "Perfil"}
            </p>
            {profile?.email && (
              <p className="truncate text-sm text-white/60">{profile.email}</p>
            )}
            <span className="mt-1.5 inline-block rounded-full bg-white/12 px-2.5 py-0.5 text-xs font-medium text-white/90 backdrop-blur-sm">
              {levelLabel((student as any)?.level)}
            </span>
          </div>
        </Link>
      </header>

      <StudentNav />
      <PullToRefresh>
        {/* pb-24: o WhatsApp mudou pro topo (não fica mais em cima do
            rodapé), mas o respiro extra continua útil em celulares com
            barra de gestos por baixo do conteúdo */}
        <main className="mx-auto max-w-2xl px-6 py-8 pb-24">{children}</main>
      </PullToRefresh>
      <WhatsAppButton />
    </div>
  );
}
