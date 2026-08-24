import * as Sentry from "@sentry/nextjs";

// Monitoramento de erros do lado do NAVEGADOR (o que quebra na tela do
// aluno e ninguém fica sabendo — ex.: o apagar-treino falhou mudo por
// semanas). Sem a NEXT_PUBLIC_SENTRY_DSN, vira no-op.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
