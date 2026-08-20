"use server";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveWithSchemaCacheRetry } from "@/lib/supabaseRetry";

// Baixa a exigência de troca depois que o usuário definiu a senha nova.
// Roda com o client admin porque a policy de profiles só deixa o dono
// atualizar o próprio perfil — o que é o caso aqui, mas o update passa por
// uma coluna que o usuário não deveria poder mexer sozinho. O id vem da
// sessão (getAuthUser), nunca do formulário.
export async function clearMustChangePassword() {
  const user = await getAuthUser();
  if (!user) throw new Error("Sessão expirada, entre de novo.");

  const admin = createAdminClient();
  const { error } = await saveWithSchemaCacheRetry(
    (payload) => admin.from("profiles").update(payload).eq("id", user.id),
    { must_change_password: false }
  );

  if (error) {
    throw new Error("Senha alterada, mas não foi possível concluir. Recarregue a página.");
  }
}
