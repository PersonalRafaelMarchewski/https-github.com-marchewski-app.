"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Tela de erro global: além de reportar pro Sentry (quando configurado),
// dá pro usuário um caminho de volta em vez da tela branca do navegador.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "Poppins, sans-serif", background: "#1F2556", color: "#fff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <div>
          <p style={{ fontSize: 40, marginBottom: 8 }}>😵</p>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Algo deu errado por aqui</h1>
          <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 20 }}>
            O problema já foi registrado. Tenta de novo — se persistir, feche e abra o app.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ background: "#ED5B35", color: "#fff", border: 0, borderRadius: 12, padding: "10px 20px", fontWeight: 600, fontSize: 14 }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
