import { createBrowserClient } from "@supabase/ssr";

// IMPORTANTE: as chamadas a process.env.NEXT_PUBLIC_* precisam ficar
// escritas literalmente aqui (não via variável/helper dinâmico), porque
// o Next.js só consegue substituir esses valores no bundle do navegador
// quando reconhece o padrão exato no código-fonte.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error("Configuração do Supabase ausente no navegador.");
  }

  return createBrowserClient(url, anonKey);
}
