import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import StudentNav from "@/components/StudentNav";
import NotificationButton from "@/components/NotificationButton";
import PullToRefresh from "@/components/PullToRefresh";
import { getSignedAvatarUrl } from "@/lib/avatar";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, avatar_url")
    .eq("id", user.id)
    .single();

  const avatarSignedUrl = await getSignedAvatarUrl(profile?.avatar_url);
  const firstName = profile?.name?.split(" ")[0] ?? "Perfil";

  return (
    <div className="min-h-screen bg-lightblue/10">
      <header className="flex items-center justify-between bg-navy px-6 py-4">
        <Image src="/logo-negativo.png" alt="Marchewski" width={101} height={56} unoptimized />
        <div className="flex items-center gap-4">
          <Link
            href="/perfil"
            className="flex items-center gap-2 text-sm text-white/90 hover:text-white"
          >
            <span className="flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded-full bg-peach/40 text-navy">
              {avatarSignedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSignedUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <User size={16} />
              )}
            </span>
            <span className="hidden font-medium sm:inline">{firstName}</span>
          </Link>
          <NotificationButton />
          <SignOutButton />
        </div>
      </header>
      <StudentNav />
      <PullToRefresh>
        <main className="mx-auto max-w-2xl px-6 py-8">{children}</main>
      </PullToRefresh>
    </div>
  );
}
