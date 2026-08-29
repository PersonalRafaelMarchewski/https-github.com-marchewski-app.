import { Quote } from "lucide-react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import TestimonialForm from "@/components/student/TestimonialForm";

// Aba "Depoimento": veio da página avulsa de depoimentos, agora dentro do
// app — o aluno já está logado, então o nome vem preenchido e o envio fica
// registrado pro personal (aba "Depoimentos"), com push na hora.
export default async function DepoimentoPage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue">Depoimentos</p>
        <div className="mt-1 flex items-center gap-2">
          <Quote size={22} className="flex-none text-orange" />
          <h1 className="text-2xl font-bold text-navy">Como está sendo treinar comigo?</h1>
        </div>
        <p className="mt-2 text-sm text-blue">
          Sua opinião ajuda outras pessoas a darem o primeiro passo. Leva menos de dois minutos.
        </p>
      </div>

      <TestimonialForm defaultName={profile?.name ?? ""} />

      <p className="text-center text-xs text-blue">
        Rafael Marchewski · CREF 127092-G/SP · Marchewski Assessoria Esportiva
      </p>
    </div>
  );
}
