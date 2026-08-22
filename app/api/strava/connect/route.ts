import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { stravaConfigured, stravaAuthUrl } from "@/lib/strava";

// Início da conexão com o Strava: o aluno clica em "Conectar" no perfil,
// cai aqui logado, e é mandado pra tela de autorização do Strava. O
// `state` aleatório vai num cookie httpOnly e é conferido na volta
// (callback) — impede alguém de forjar a volta com um code de outra conta.
export async function GET(request: NextRequest) {
  if (!stravaConfigured()) {
    return NextResponse.redirect(new URL("/perfil", request.url));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || request.nextUrl.origin;
  const state = randomBytes(16).toString("hex");

  const res = NextResponse.redirect(stravaAuthUrl(`${siteUrl}/api/strava/callback`, state));
  res.cookies.set("strava_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutos pra completar a autorização
    path: "/api/strava",
  });
  return res;
}
