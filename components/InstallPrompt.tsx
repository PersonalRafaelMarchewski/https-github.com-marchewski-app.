"use client";

import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";

const DISMISS_KEY = "installPromptDismissedAt";
const DISMISS_DAYS = 14; // some por um tempo, mas volta a aparecer depois — não incomoda toda vez

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true // iOS
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

// Avisa o aluno/personal, na primeira visita, que dá pra instalar o app
// na tela inicial do celular — sem isso, muita gente nunca descobre essa
// opção sozinha e fica usando só pelo navegador.
export default function InstallPrompt() {
  const [platform, setPlatform] = useState<"none" | "android" | "ios">("none");
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return; // já instalado, não mostra nada

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    const daysSinceDismiss = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    if (dismissedAt && daysSinceDismiss < DISMISS_DAYS) return;

    if (isIos()) {
      setPlatform("ios");
      return;
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform("android");
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setPlatform("none");
  }

  async function handleInstallClick() {
    const promptEvent = deferredPrompt as (Event & { prompt: () => void; userChoice: Promise<unknown> }) | null;
    if (!promptEvent) return;
    promptEvent.prompt();
    await promptEvent.userChoice;
    setDeferredPrompt(null);
    handleDismiss();
  }

  if (platform === "none") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3">
      <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-lightblue/30 bg-white p-4 shadow-lg">
        <div className="min-w-0 flex-1">
          <p className="font-heading font-semibold text-navy">Instale o app no seu celular</p>
          {platform === "ios" ? (
            <p className="mt-1 text-sm text-blue">
              Toque em <Share2 size={14} className="inline align-text-bottom" /> (compartilhar) e
              depois em "Adicionar à Tela de Início".
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-blue">
                Acesso mais rápido, direto da tela inicial do seu celular.
              </p>
              <button
                type="button"
                onClick={handleInstallClick}
                className="mt-2 flex items-center gap-1.5 rounded-full bg-orange px-3 py-1.5 text-sm font-medium text-white"
              >
                <Download size={14} />
                Instalar app
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fechar aviso de instalação"
          className="flex-none text-blue"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
