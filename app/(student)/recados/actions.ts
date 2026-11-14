"use server";

import { createClient } from "@/lib/supabase/server";

// Marca que o aluno acabou de abrir o mural — some a bolinha de "não
// lido" na navegação até o próximo recado chegar.
export async function markMuralSeen() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ mural_last_seen_at: new Date().toISOString() })
    .eq("id", user.id);
}
