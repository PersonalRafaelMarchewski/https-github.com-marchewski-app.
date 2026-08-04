"use server";

import { createClient } from "@/lib/supabase/server";
import { sendPushToProfile } from "@/lib/sendPush";

export async function notifyNewWorkout(studentId: string, workoutName: string) {
  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("profile_id")
    .eq("id", studentId)
    .single();

  if (!student?.profile_id) return;

  await sendPushToProfile(student.profile_id, {
    title: "Novo treino disponível!",
    body: `Seu personal criou o treino "${workoutName}" pra você.`,
    url: "/treino-do-dia",
  });
}
