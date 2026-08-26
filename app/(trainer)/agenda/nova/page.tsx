import Link from "next/link";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import SessionForm from "@/components/SessionForm";

export default async function NovaAulaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; time?: string; compromisso?: string }>;
}) {
  const { date, time, compromisso } = await searchParams;
  const isCompromisso = compromisso === "1";
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: students } = await supabase
    .from("students")
    .select("id, service_type, profiles:profile_id (name)")
    .eq("trainer_id", user!.id)
    .eq("status", "active");

  const studentOptions = (students ?? []).map((s: any) => ({
    id: s.id,
    name: s.profiles?.name ?? "Aluno sem nome",
    serviceType: s.service_type ?? "assessoria",
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">
        {isCompromisso ? "Novo compromisso" : "Nova aula"}
      </h1>
      <SessionForm
        students={studentOptions}
        defaultDate={date}
        defaultTime={time}
        defaultNoStudent={isCompromisso}
      />
      <Link href="/agenda" className="text-sm text-blue hover:underline">
        ← Voltar pra agenda
      </Link>
    </div>
  );
}
