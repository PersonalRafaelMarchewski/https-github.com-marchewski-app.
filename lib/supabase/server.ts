import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { requiredEnv } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component — ignored because middleware
            // refreshes the session on every request
          }
        },
      },
    }
  );
}

// O layout de cada área (trainer/student) confere o login, e a página em
// cima dele confere de novo — cada auth.getUser() é uma ida de verdade até
// o servidor da Supabase. O cache() do React garante que, dentro da mesma
// navegação, essa checagem só acontece uma vez, mesmo chamada várias vezes
// em componentes diferentes (layout + página).
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// Papel do usuário logado ("trainer" | "student"), pra cada área conferir
// que quem está ali pertence ali — segunda camada de defesa por cima do
// RLS, que hoje é a única coisa segurando um aluno logado que digite
// /financas na barra de endereço. Mesmo cache() do getAuthUser: uma ida ao
// banco por navegação, mesmo consultado no layout e na página.
export const getAuthProfile = cache(
  async (): Promise<{ role: string | null; mustChangePassword: boolean }> => {
    const user = await getAuthUser();
    if (!user) return { role: null, mustChangePassword: false };

    const supabase = await createClient();
    // "must_change_password" tolera a migração ainda não ter rodado: pedir
    // a coluna inexistente derruba a consulta inteira, então cai pro select
    // só com role (e ninguém é bloqueado até a migração rodar)
    const { data, error } = await supabase
      .from("profiles")
      .select("role, must_change_password")
      .eq("id", user.id)
      .maybeSingle();

    if (!error) {
      return {
        role: data?.role ?? null,
        mustChangePassword: data?.must_change_password === true,
      };
    }

    const { data: fallback } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    return { role: fallback?.role ?? null, mustChangePassword: false };
  }
);
