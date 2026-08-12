import { notFound } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import NovaDietaForm from "@/components/NovaDietaForm";

export default async function EditarDietaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: plan } = await supabase
    .from("diet_plans")
    .select(
      "id, student_id, name, status, start_date, end_date, daily_calories, daily_protein, daily_carbs, daily_fat"
    )
    .eq("id", id)
    .eq("trainer_id", user!.id)
    .single();

  if (!plan) notFound();

  const { data: meals } = await supabase
    .from("diet_meals")
    .select("id, name, suggested_time, description, calories, protein, carbs, fat")
    .eq("plan_id", id)
    .order("order_index");

  const { data: students } = await supabase
    .from("students")
    .select("id, profiles:profile_id (name)")
    .eq("trainer_id", user!.id)
    .eq("status", "active");

  const studentOptions = (students ?? []).map((s: any) => ({
    id: s.id,
    name: s.profiles?.name ?? "Aluno sem nome",
  }));

  const mealRows = (meals ?? []).map((m) => ({
    key: m.id,
    name: m.name,
    suggested_time: m.suggested_time ?? "",
    description: m.description ?? "",
    calories: m.calories?.toString() ?? "",
    protein: m.protein?.toString() ?? "",
    carbs: m.carbs?.toString() ?? "",
    fat: m.fat?.toString() ?? "",
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy">Editar plano alimentar</h1>
      <NovaDietaForm students={studentOptions} initialPlan={plan} initialMeals={mealRows} />
    </div>
  );
}
