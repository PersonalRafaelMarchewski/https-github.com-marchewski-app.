import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Integração com o Strava (cardio na rua marca a ficha sozinho).
//
// Segue o padrão do Turnstile: se as chaves não estiverem configuradas,
// tudo aqui se desativa graciosamente — o botão de conectar nem aparece
// no perfil do aluno e o webhook responde ok sem fazer nada.
//
// Limite do Strava que importa saber: app novo começa em "single-player"
// (1 atleta). No painel deles (strava.com/settings/api) dá pra subir
// sozinho pra 10 atletas; acima disso o app precisa passar pela revisão
// do Strava. Quando o 10º aluno conectar, é hora de submeter.

const STRAVA_OAUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API = "https://www.strava.com/api/v3";

export function stravaConfigured(): boolean {
  return Boolean(
    process.env.STRAVA_CLIENT_ID?.trim() && process.env.STRAVA_CLIENT_SECRET?.trim()
  );
}

export function stravaAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!.trim(),
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    // activity:read_all inclui atividades marcadas como privadas — corrida
    // de rua costuma ser privada por padrão pra quem usa zona de privacidade
    scope: "read,activity:read_all",
    state,
  });
  return `${STRAVA_OAUTH_URL}?${params}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch em segundos
  athlete?: { id: number };
  scope?: string;
};

export async function exchangeStravaCode(code: string): Promise<TokenResponse | null> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID!.trim(),
      client_secret: process.env.STRAVA_CLIENT_SECRET!.trim(),
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return null;
  return (await res.json()) as TokenResponse;
}

// Devolve um access token válido pro atleta, renovando com o refresh
// token quando estiver perto de expirar (o do Strava dura 6 horas).
export async function getValidAccessToken(stravaAthleteId: number): Promise<string | null> {
  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("strava_connections")
    .select("profile_id, access_token, refresh_token, expires_at")
    .eq("strava_athlete_id", stravaAthleteId)
    .single();
  if (!conn) return null;

  const expiresAt = new Date(conn.expires_at).getTime();
  if (expiresAt - Date.now() > 5 * 60 * 1000) {
    return conn.access_token;
  }

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID!.trim(),
      client_secret: process.env.STRAVA_CLIENT_SECRET!.trim(),
      grant_type: "refresh_token",
      refresh_token: conn.refresh_token,
    }),
  });
  if (!res.ok) return null;
  const fresh = (await res.json()) as TokenResponse;

  await admin
    .from("strava_connections")
    .update({
      access_token: fresh.access_token,
      refresh_token: fresh.refresh_token,
      expires_at: new Date(fresh.expires_at * 1000).toISOString(),
    })
    .eq("profile_id", conn.profile_id);

  return fresh.access_token;
}

export type StravaActivity = {
  id: number;
  type: string;
  name: string;
  distance: number; // metros
  moving_time: number; // segundos
  start_date_local: string; // ISO
};

export async function fetchStravaActivity(
  accessToken: string,
  activityId: number
): Promise<StravaActivity | null> {
  const res = await fetch(`${STRAVA_API}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as StravaActivity;
}

// Nomes em português pros tipos mais comuns — o que cai fora da lista
// mostra o tipo cru do Strava mesmo.
const TYPE_LABELS: Record<string, string> = {
  Run: "Corrida",
  TrailRun: "Trail run",
  Walk: "Caminhada",
  Hike: "Trilha",
  Ride: "Pedal",
  MountainBikeRide: "Pedal (MTB)",
  Swim: "Natação",
  Elliptical: "Elíptico",
  StairStepper: "Escada",
  Rowing: "Remo",
  VirtualRun: "Corrida (esteira/virtual)",
  VirtualRide: "Pedal (rolo/virtual)",
};

export function describeActivity(a: StravaActivity): string {
  const label = TYPE_LABELS[a.type] ?? a.type;
  const parts = [label];
  if (a.distance > 0) {
    const km = a.distance / 1000;
    parts.push(`${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`);
  }
  if (a.moving_time > 0) {
    const min = Math.round(a.moving_time / 60);
    parts.push(min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}` : `${min}min`);
  }
  return parts.join(" · ");
}
