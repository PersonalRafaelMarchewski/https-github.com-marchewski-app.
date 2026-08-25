import { sumMacros, addMacros, EMPTY_MACROS, type Macros } from "@/lib/nutrition";
import type { DayItem } from "@/components/NutritionCalendar";

// Montagem do histórico de nutrição por dia (refeições prescritas feitas +
// diário livre), extraída do recordatório do personal quando o calendário
// passou a aparecer também pro aluno ("Meu histórico" em /nutricao) — as
// duas telas mostram o MESMO dado e precisam montar do mesmo jeito.
//
// A RLS resolve o escopo sozinha: o personal enxerga os registros dos seus
// alunos, o aluno só os próprios — a query é idêntica nos dois lados.
export async function loadNutritionHistory(
  supabase: any,
  studentId: string
): Promise<{ macrosByDate: Record<string, Macros>; itemsByDate: Record<string, DayItem[]> }> {
  const macrosByDate: Record<string, Macros> = {};
  const itemsByDate: Record<string, DayItem[]> = {};

  function addToDay(date: string, macros: Macros, item: DayItem) {
    macrosByDate[date] = addMacros(macrosByDate[date] ?? EMPTY_MACROS, macros);
    (itemsByDate[date] ??= []).push(item);
  }

  // refeições prescritas marcadas como feitas, com o alimento de verdade
  // escolhido (ou o texto livre antigo, como reserva) — tolera as tabelas
  // novas ainda não existirem
  try {
    const { data: logs } = await supabase
      .from("diet_logs")
      .select(
        "date, actual_food, diet_meals:meal_id (name), diet_log_foods (quantity_g, foods:food_id (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g))"
      )
      .eq("student_id", studentId)
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

  // diário livre (tudo que o aluno registrou por conta própria)
  try {
    const { data: entries } = await supabase
      .from("diet_diary_entries")
      .select(
        "date, label, logged_at, diet_diary_entry_foods (quantity_g, foods:food_id (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g))"
      )
      .eq("student_id", studentId)
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

  return { macrosByDate, itemsByDate };
}
