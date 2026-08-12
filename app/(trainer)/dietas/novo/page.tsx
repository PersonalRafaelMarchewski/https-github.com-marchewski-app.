import { createClient, getAuthUser } from "@/lib/supabase/server";
import NovaDietaForm from "@/components/NovaDietaForm";

export default async function NovaDietaPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { student: defaultStudentId } = await searchParams;
  const supabase = await createClient();
  const user = await getAuthUser();

  const [{ data: students }, { data: foods }] = await Promise.all([
    supabase
      .from("students")
      .select("id, profiles:profile_id (name)")
      .eq("trainer_id", user!.id)
      .eq("status", "active"),
    supabase
      .from("foods")
      .select("id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g")
      .order("name"),
  ]);

  const studentOptions = (students ?? []).map((s: any) => ({
    id: s.id,
    name: s.profiles?.name ?? "Aluno sem nome",
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy">Criar plano alimentar</h1>
      <NovaDietaForm
        students={studentOptions}
        foods={foods ?? []}
        defaultStudentId={defaultStudentId}
      />
    </div>
  );
}
