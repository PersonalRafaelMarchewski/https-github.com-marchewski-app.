"use client";

import { useEffect, useRef } from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id: string) => void;
    };
  }
}

// Desafio invisível do Cloudflare Turnstile: na maioria das vezes o visitante
// não vê nada, só robô é parado. O token gerado entra no formulário como
// "cf-turnstile-response" e é conferido no servidor (ver lib/turnstile.ts).
//
// Sem NEXT_PUBLIC_TURNSTILE_SITE_KEY configurada o componente não renderiza
// nada — o cadastro segue funcionando normalmente (com o rate limit por IP
// segurando), em vez de quebrar por falta de variável de ambiente.
export default function TurnstileWidget({ resetSignal }: { resetSignal?: unknown }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // O token do Turnstile é de uso único: se o servidor recusou o envio
  // (e-mail repetido, campo faltando etc.), o token foi gasto na conferência
  // e o próximo envio falharia com "recarregue a página" — apagando tudo.
  // Quando o formulário sinaliza um novo erro (resetSignal muda), pedimos
  // um token novo sem a pessoa perceber.
  useEffect(() => {
    if (resetSignal == null) return;
    if (widgetIdRef.current && window.turnstile?.reset) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetSignal]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;

    function renderWidget() {
      if (cancelled || !window.turnstile || !containerRef.current) return;
      // o StrictMode do React roda o efeito duas vezes em dev; sem essa
      // guarda apareciam dois widgets empilhados
      if (widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        language: "pt-br",
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", renderWidget);
      } else {
        const script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.addEventListener("load", renderWidget);
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) return null;

  return <div ref={containerRef} className="flex justify-center" />;
}
