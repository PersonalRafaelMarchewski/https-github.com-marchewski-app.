import { createClient } from "@/lib/supabase/server";
import NovoTreinoForm from "@/components/NovoTreinoForm";

export default async function NovoTreinoPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { student: defaultStudentId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: students }, { data: exercises }] = await Promise.all([
    supabase
      .from("students")
      .select("id, profiles:profile_id (name)")
      .eq("trainer_id", user!.id)
      .eq("status", "active"),
    supabase.from("exercises").select("id, name, muscle_group").order("name"),
  ]);

  const studentOptions = (students ?? []).map((s: any) => ({
    id: s.id,
    name: s.profiles?.name ?? "Aluno sem nome",
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
