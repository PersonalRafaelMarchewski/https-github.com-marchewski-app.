import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Confere com o Cloudflare que o token veio de um visitante de verdade.
//
// Sem TURNSTILE_SECRET_KEY configurada, libera: assim o deploy do código não
// derruba o cadastro enquanto a variável de ambiente não estiver na Vercel
// (o rate limit por IP continua valendo nesse meio-tempo).
export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;

  if (!token) return false;

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });

    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    // Cloudflare fora do ar ou rede instável: não dá pra provar que é robô,
    // e barrar todo mundo seria pior do que deixar passar — o rate limit por
    // IP continua de pé como segunda barreira.
    return true;
  }
}
