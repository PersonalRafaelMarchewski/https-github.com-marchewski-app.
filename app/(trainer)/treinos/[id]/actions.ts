"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type UpdateWorkoutState = { error: string | null };

// "Number(x) || null" trata 0 como se fosse vazio (0 é falso em JS) — então
// diminuir séries/descanso até 0 salvava como nulo em vez de 0 de verdade.
// Essa função só cai pra null quando o campo não é um número válido mesmo.
function numberOrNull(value: FormDataEntryValue | null): number | null {
  const n = Number(value);
  return value !== null && value !== "" && Number.isFinite(n) ? n : null;
}

// Persiste a nova ordem depois de arrastar pra reordenar os exercícios de
// uma ficha. orderedIds já vem na ordem final desejada.
export async function reorderWorkoutExercises(orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("workout_exercises").update({ order_index: index }).eq("id", id)
    )
  );
}

export async function updateWorkout(
  workoutId: string,
  studentId: string,
  _prevState: UpdateWorkoutState,
  formData: FormData
): Promise<UpdateWorkoutState> {
  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const status = String(formData.get("status") ?? "active");
  const plannedSessionsRaw = String(formData.get("planned_sessions") ?? "").trim();
  const plannedSessions = plannedSessionsRaw ? Number(plannedSessionsRaw) : null;

  if (!name) {
    return { error: "Nome é obrigatório." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workouts")
    .update({
      name,
      start_date: startDate || null,
      end_date: endDate || null,
      status,
      planned_sessions: plannedSessions,
    })
    .eq("id", workoutId);

  if (error) {
    return { error: "Não foi possível salvar o treino." };
  }

  redirect(`/alunos/${studentId}`);
}

export async function updateWorkoutExercise(id: string, workoutId: string, formData: FormData) {
  const label = String(formData.get("label") ?? "A");
  const sets = numberOrNull(formData.get("sets"));
  const reps = String(formData.get("reps") ?? "") || null;
  const load = String(formData.get("load") ?? "") || null;
  const restSeconds = numberOrNull(formData.get("rest_seconds"));
  const method = String(formData.get("method") ?? "") || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("workout_exercises")
    .update({ label, sets, reps, load, rest_seconds: restSeconds, method })
    .eq("id", id);

  if (error) {
    throw new Error("Não foi possível salvar o exercício.");
  }

  revalidatePath(`/treinos/${workoutId}/editar`);
}

export async function addWorkoutExercise(workoutId: string, formData: FormData) {
  const exerciseId = String(formData.get("exercise_id") ?? "");
  const label = String(formData.get("label") ?? "A");
  const sets = numberOrNull(formData.get("sets"));
  const reps = String(formData.get("reps") ?? "") || null;
  const load = String(formData.get("load") ?? "") || null;
  const restSeconds = numberOrNull(formData.get("rest_seconds"));
  const method = String(formData.get("method") ?? "") || null;

  if (!exerciseId) {
    throw new Error("Escolha um exercício.");
  }

  const supabase = await createClient();

  const { count } = await supabase
    .from("workout_exercises")
    .select("id", { count: "exact", head: true })
    .eq("workout_id", workoutId);

  const { error } = await supabase.from("workout_exercises").insert({
    workout_id: workoutId,
    exercise_id: exerciseId,
    label,
    sets,
    reps,
    load,
    rest_seconds: restSeconds,
    method,
    order_index: count ?? 0,
  });

  if (error) {
    throw new Error("Não foi possível adicionar o exercício.");
  }

  revalidatePath(`/treinos/${workoutId}/editar`);
}

export async function deleteWorkoutExerciseRow(id: string, workoutId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("workout_exercises").delete().eq("id", id);

  if (error) {
    throw new Error(
      "Não foi possível remover: esse exercício já tem histórico registrado pelo aluno."
    );
  }

  revalidatePath(`/treinos/${workoutId}/editar`);
}
