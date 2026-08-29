import type { Metadata } from "next";
import Image from "next/image";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import TestimonialForm from "@/components/TestimonialForm";

export const metadata: Metadata = {
  title: "Deixe seu depoimento — Marchewski",
  description: "Conte como está sendo treinar com o Rafael Marchewski.",
};

// Página pública (liberada no proxy.ts). Se o aluno abrir já logado no
// app, o nome vem preenchido; sem login funciona igual, só em branco.
export default async function DepoimentosPage() {
  let initialName = "";
  try {
    const user = await getAuthUser();
    if (user) {
      const supabase = await createClient();
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      initialName = data?.name ?? "";
    }
  } catch {
    // sem sessão ou sem perfil: segue em branco
  }

  return (
    <div className="min-h-screen bg-lightblue/10 px-4 py-8">
      <div className="mb-6 flex justify-center">
        <Image src="/logo-positivo.png" alt="Marchewski" width={140} height={78} unoptimized />
      </div>

      <div className="mx-auto mb-6 max-w-lg text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-blue">Depoimentos</p>
        <h1 className="text-2xl font-bold text-navy">Como está sendo treinar comigo?</h1>
        <p className="mt-2 text-sm text-blue">
          Sua opinião ajuda outras pessoas a darem o primeiro passo. Leva menos de dois minutos:
          ao enviar, o seu WhatsApp abre com a mensagem pronta.
        </p>
      </div>

      <TestimonialForm initialName={initialName} />

      <p className="mt-8 text-center text-xs text-lightblue">
        Marchewski Assessoria Esportiva · CREF 127092-G/SP
      </p>
    </div>
  );
}
