import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import FirstLoginPasswordForm from "@/components/FirstLoginPasswordForm";

// Tela de bloqueio do primeiro login: quem entrou com a senha temporária
// (criada pelo personal ou pelo cadastro público, e que passou por
// tela/e-mail/WhatsApp) precisa definir uma senha própria antes de usar o
// app. O redirecionamento pra cá vem dos layouts de aluno e de personal.
export default async function TrocarSenhaPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  // já trocou (ou a coluna nem existe ainda): não tem o que fazer aqui
  if (!profile?.must_change_password) {
    redirect(profile?.role === "trainer" ? "/dashboard" : "/treino-do-dia");
  }

  return (
    <div className="min-h-screen bg-lightblue/10">
      <header className="rounded-b-[28px] bg-gradient-to-br from-navy via-navy to-blue px-6 py-5">
        <Image src="/logo-negativo.png" alt="Marchewski" width={101} height={56} unoptimized />
      </header>

      <main className="mx-auto max-w-md px-6 py-8">
        <h1 className="mb-1 text-2xl font-bold text-navy">Crie sua senha</h1>
        <p className="mb-6 text-sm text-blue">
          Você entrou com uma senha temporária. Escolha uma senha só sua pra continuar — ela
          substitui a que você recebeu.
        </p>
        <FirstLoginPasswordForm redirectTo={profile.role === "trainer" ? "/dashboard" : "/treino-do-dia"} />
      </main>
    </div>
  );
}
