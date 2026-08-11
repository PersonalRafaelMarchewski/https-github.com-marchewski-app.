import { createClient, getAuthUser } from "@/lib/supabase/server";
import NovoTreinoForm from "@/components/NovoTreinoForm";

export default async function NovoTreinoPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { student: defaultStudentId } = await searchParams;
  const supabase = await createClient();
  const user = await getAuthUser();

  const [{ data: students }, { data: exercises }] = await Promise.all([
    supabase
      .from("students")
      .select("id, level, profiles:profile_id (name)")
      .eq("trainer_id", user!.id)
      .eq("status", "active"),
    supabase.from("exercises").select("id, name, muscle_group").order("name"),
  ]);

  const studentOptions = (students ?? []).map((s: any) => ({
    id: s.id,
    name: s.profiles?.name ?? "Aluno sem nome",
    level: s.level ?? "intermediario",
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy">Criar treino</h1>
      <NovoTreinoForm
        students={studentOptions}
        exercises={exercises ?? []}
        defaultStudentId={defaultStudentId}
      />
    </div>
  );
}
