import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requiredEnv } from "@/lib/env";

// Rotas que funcionam sem login. Tudo que NÃO estiver aqui exige sessão —
// o contrário da lógica antiga, que listava as rotas protegidas e por isso
// vivia desatualizada (tela nova nascia desprotegida até alguém lembrar de
// incluir na lista).
const PUBLIC_PATHS = [
  "/login",
  "/cadastro",
  "/redefinir-senha",
];

// Endpoints de máquina: não têm sessão de usuário porque se autenticam de
// outro jeito — assinatura da Stripe no webhook, Bearer CRON_SECRET nos
// crons (ver app/api/**). Redirecionar esses pro /login quebraria a
// integração.
const PUBLIC_API_PREFIXES = ["/api/webhooks/", "/api/cron/"];

// Arquivos do PWA que o navegador busca sem cookie de sessão (o service
// worker inclusive é registrado antes do login). O matcher lá embaixo já
// tira imagens e assets do _next; estes precisam ser listados à mão.
const PUBLIC_FILES = ["/manifest.json", "/sw.js"];

function isPublicPath(pathname: string) {
  // "/" só redireciona pro /login (ver app/page.tsx)
  if (pathname === "/") return true;
  if (PUBLIC_FILES.includes(pathname)) return true;
  if (pathname.startsWith("/ffmpeg/")) return true;
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
