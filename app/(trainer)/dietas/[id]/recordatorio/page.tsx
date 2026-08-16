import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import Card from "@/components/Card";
import NutritionCalendar, { type DayItem } from "@/components/NutritionCalendar";
import { sumMacros, addMacros, EMPTY_MACROS, type Macros } from "@/lib/nutrition";

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

  const macrosByDate: Record<string, Macros> = {};
  const itemsByDate: Record<string, DayItem[]> = {};

  function addToDay(date: string, macros: Macros, item: DayItem) {
    macrosByDate[date] = addMacros(macrosByDate[date] ?? EMPTY_MACROS, macros);
    (itemsByDate[date] ??= []).push(item);
  }

  // refeições prescritas marcadas como feitas, com o alimento de verdade
  // escolhido (ou o texto livre antigo, como reserva) — tolera as tabelas
  // novas ainda não existirem (mesmo padrão de tolerância usado em
  // app/(student)/nutricao/page.tsx)
  try {
    const { data: logs } = await supabase
      .from("diet_logs")
      .select(
        "date, actual_food, diet_meals:meal_id (name), diet_log_foods (quantity_g, foods:food_id (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g))"
      )
      .eq("student_id", plan.student_id)
      .eq("completed", true)
      .order("date", { ascending: false });

    for (const log of (logs ?? []) as any[]) {
      const foodItems = (log.diet_log_foods ?? []).filter((f: any) => f.foods);
      const macros = sumMacros(
        foodItems.map((f: any) => ({
          quantity_g: f.quantity_g,
          calories_per_100g: f.foods.calories_per_100g,
          protein_per_100g: f.foods.protein_per_100g,
          carbs_per_100g: f.foods.carbs_per_100g,
          fat_per_100g: f.foods.fat_per_100g,
        }))
      );
      const foodLabels: string[] =
        foodItems.length > 0
          ? foodItems.map((f: any) => `${f.foods.name} — ${f.quantity_g}g`)
          : log.actual_food
            ? [log.actual_food]
            : [];

      addToDay(log.date, macros, {
        label: log.diet_meals?.name ?? "Refeição prescrita",
        source: "prescrito",
        foods: foodLabels,
      });
    }
  } catch {
    // segue sem os registros prescritos — o diário livre abaixo ainda funciona
  }

  // diário livre (tudo que o aluno registrou por conta própria, sem
  // vínculo com refeição prescrita) — mesma tolerância de tabela nova
  try {
    const { data: entries } = await supabase
      .from("diet_diary_entries")
      .select(
        "date, label, logged_at, diet_diary_entry_foods (quantity_g, foods:food_id (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g))"
      )
      .eq("student_id", plan.student_id)
      .order("logged_at", { ascending: false });

    for (const entry of (entries ?? []) as any[]) {
      const foodItems = (entry.diet_diary_entry_foods ?? []).filter((f: any) => f.foods);
      const macros = sumMacros(
        foodItems.map((f: any) => ({
          quantity_g: f.quantity_g,
          calories_per_100g: f.foods.calories_per_100g,
          protein_per_100g: f.foods.protein_per_100g,
          carbs_per_100g: f.foods.carbs_per_100g,
          fat_per_100g: f.foods.fat_per_100g,
        }))
      );
      const time = entry.logged_at
        ? new Date(entry.logged_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : null;

      addToDay(entry.date, macros, {
        label: entry.label || (time ? `Diário — ${time}` : "Diário"),
        source: "diario",
        foods: foodItems.map((f: any) => `${f.foods.name} — ${f.quantity_g}g`),
      });
    }
  } catch {
    // segue sem o diário livre — os registros prescritos acima ainda funcionam
  }

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
