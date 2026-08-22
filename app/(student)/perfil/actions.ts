"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// Desconecta o Strava da conta do aluno logado. A tabela de conexões não
// tem policy nenhuma (tokens são sensíveis), então a exclusão passa pela
// service_role — mas SEMPRE do próprio usuário da sessão, nunca por id
// vindo do cliente.
export async function disconnectStrava() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createAdminClient();
  await admin.from("strava_connections").delete().eq("profile_id", user.id);
  revalidatePath("/perfil");
}
