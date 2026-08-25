import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import Card from "@/components/Card";
import NutritionCalendar from "@/components/NutritionCalendar";
import { loadNutritionHistory } from "@/lib/nutritionHistory";

// "Recordatório" do plano alimentar: calendário com os dias em que o aluno
// registrou algo (refeição prescrita marcada como feita OU diário livre),
// e o total de kcal/macros de cada dia contra a meta do plano. A busca é
// pelo aluno inteiro, não só pelo período deste plano específico — faz
// sentido porque o diário livre não tem vínculo com plano nenhum, e trocar
// de plano não deveria "esconder" o que o aluno já registrou antes.
export default async function RecordatorioDietaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: plan } = await supabase
    .from("diet_plans")
    .select("id, student_id, name, daily_calories, daily_protein, daily_carbs, daily_fat")
    .eq("id", id)
    .eq("trainer_id", user!.id)
    .single();

  if (!plan) notFound();

  const { data: student } = await supabase
    .from("students")
    .select("id, profiles:profile_id (name)")
    .eq("id", plan.student_id)
    .single();

  const studentName = (student as any)?.profiles?.name ?? "Aluno";

  const { macrosByDate, itemsByDate } = await loadNutritionHistory(supabase, plan.student_id);

  return (
    <div>
      <Link
        href={`/dietas/${id}/editar`}
        className="mb-2 flex items-center gap-1.5 text-sm text-blue hover:underline"
      >
        <ArrowLeft size={16} />
        Voltar pro plano
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-navy">Recordatório</h1>
      <p className="mb-6 text-blue">
        {plan.name} · {studentName}
      </p>

      <Card>
        <NutritionCalendar
          macrosByDate={macrosByDate}
          itemsByDate={itemsByDate}
          targets={{
            calories: plan.daily_calories,
            protein: plan.daily_protein,
            carbs: plan.daily_carbs,
            fat: plan.daily_fat,
          }}
        />
      </Card>
    </div>
  );
}
