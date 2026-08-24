import * as Sentry from "@sentry/nextjs";

// Monitoramento de erros do lado do SERVIDOR (Server Components, Server
// Actions, rotas de API). Sem a SENTRY_DSN configurada na Vercel, o init
// vira no-op — o app roda exatamente como antes. Com ela, todo erro que
// hoje morre em silêncio nos logs passa a aparecer no painel do Sentry
// com aviso por e-mail.
export async function register() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0, // só erros — sem telemetria de performance
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
