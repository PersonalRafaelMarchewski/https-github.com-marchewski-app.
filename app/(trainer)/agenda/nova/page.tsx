import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SessionForm from "@/components/SessionForm";

export default async function NovaAulaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; time?: string }>;
}) {
  const { date, time } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
      <h1 className="text-2xl font-bold text-navy">Nova aula</h1>
      <SessionForm students={studentOptions} defaultDate={date} defaultTime={time} />
      <Link href="/agenda" className="text-sm text-blue hover:underline">
        ← Voltar pra agenda
      </Link>
    </div>
  );
}
