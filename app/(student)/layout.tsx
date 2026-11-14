import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";
import { createClient, getAuthUser, getAuthProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StudentNav from "@/components/StudentNav";
import NotificationNudge from "@/components/NotificationNudge";
import OfflineSyncRunner from "@/components/OfflineSyncRunner";
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

  // personal que caia numa rota de aluno volta pro painel dele — mesma
  // barreira de código do lado do trainer, sem depender só do RLS
  const { role, mustChangePassword } = await getAuthProfile();
  if (role === "trainer") redirect("/dashboard");
  if (mustChangePassword) redirect("/trocar-senha");

  // mural_last_seen_at é coluna nova (migração ainda pode não ter rodado)
  // — pedir uma coluna que não existe recusa a consulta INTEIRA, sumindo
  // com nome/foto/nível do cabeçalho. Tenta com ela; se falhar, cai pra
  // versão sem, igual os outros fallbacks desse tipo no app.
  let student: any = null;
  {
    const { data, error } = await supabase
      .from("students")
      .select("level, profiles:profile_id (name, email, avatar_url, mural_last_seen_at)")
      .eq("profile_id", user.id)
      .single();
    if (error) {
      const fallback = await supabase
        .from("students")
        .select("level, profiles:profile_id (name, email, avatar_url)")
        .eq("profile_id", user.id)
        .single();
      student = fallback.data;
    } else {
      student = data;
    }
  }

  const profile = (student as any)?.profiles;
  const avatarSignedUrl = await getSignedAvatarUrl(profile?.avatar_url);

  // Bolinha de recado não lido: o mural já chega pro aluno independente
  // de notificação (RLS não depende disso) — isso aqui é só pra ele não
  // escapar do recado mesmo sem o push, vendo que tem algo novo ao abrir
  // o app. Tolera a coluna ainda não existir (migração pendente).
  const { count: unreadMuralCount } = await supabase
    .from("mural_posts")
    .select("id", { count: "exact", head: true })
    .gt("created_at", profile?.mural_last_seen_at ?? "1970-01-01T00:00:00Z");

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

      <StudentNav unreadMuralCount={unreadMuralCount ?? 0} />
      <NotificationNudge />
      <OfflineSyncRunner />
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
