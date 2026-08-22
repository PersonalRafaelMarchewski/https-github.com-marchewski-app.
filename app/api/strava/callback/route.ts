import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stravaConfigured, exchangeStravaCode } from "@/lib/strava";

// Volta da autorização no Strava. O aluno chega aqui ainda logado (mesmo
// navegador), então a identidade vem da sessão — o `state` do cookie só
// confirma que a ida saiu daqui mesmo. Troca o code por tokens e guarda
// na strava_connections (tabela sem policy nenhuma: só o servidor toca).
export async function GET(request: NextRequest) {
  const back = (q: string) => NextResponse.redirect(new URL(`/perfil?strava=${q}`, request.url));

  if (!stravaConfigured()) return back("erro");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get("strava_oauth_state")?.value;
  // "access_denied" = aluno desistiu na tela do Strava — sem drama
  if (!code || !state || !cookieState || state !== cookieState) {
    return back("cancelado");
  }

  const tokens = await exchangeStravaCode(code);
  if (!tokens?.athlete?.id) return back("erro");

  const admin = createAdminClient();
  const { error } = await admin.from("strava_connections").upsert(
    {
      profile_id: user.id,
      strava_athlete_id: tokens.athlete.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(tokens.expires_at * 1000).toISOString(),
      scope: tokens.scope ?? null,
    },
    { onConflict: "profile_id" }
  );
  if (error) return back("erro");

  const res = back("ok");
  res.cookies.delete("strava_oauth_state");
  return res;
}
