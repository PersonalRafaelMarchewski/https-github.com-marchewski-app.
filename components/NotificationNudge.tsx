"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { saveSubscription } from "@/app/(student)/push/actions";

const DISMISS_KEY = "notification-nudge-dismissed-at";
const DISMISS_DAYS = 7;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Banner "ative as notificações": lembretes de aula, mural e avisos de
// treino só chegam pra quem tem a inscrição de push — e as inscrições
// morreram na troca de domínio (só 3 de ~30 usuários tinham em 24/08).
// Aparece só pra quem NÃO tem inscrição neste aparelho; dispensar esconde
// por 7 dias; ativar esconde pra sempre (a checagem passa a achar a
// inscrição). Montado nos dois layouts (aluno e personal).
export default function NotificationNudge() {
  const [visible, setVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return; // não adianta pedir
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed && Date.now() - Number(dismissed) < DISMISS_DAYS * 86_400_000) return;
    } catch {
      // storage bloqueado — segue e mostra
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (!sub) setVisible(true);
    });
  }, []);

  async function handleEnable() {
    setEnabling(true);
    setError(false);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError(true);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("sem chave");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      await saveSubscription({
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
      });
      setVisible(false);
    } catch {
      setError(true);
    } finally {
      setEnabling(false);
    }
  }

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // sem storage, só esconde nesta visita
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mx-6 mt-3 flex items-center gap-3 rounded-xl bg-gradient-to-r from-orange to-orange2 px-4 py-3 text-white shadow-[0_6px_20px_-6px_rgba(237,91,53,0.55)]">
      <Bell size={20} className="flex-none" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">Ative as notificações</p>
        <p className="text-xs leading-tight text-white/85">
          Lembretes de aula, recados e avisos de treino chegam direto no seu celular.
        </p>
        {error && (
          <p className="mt-0.5 text-xs font-medium leading-tight">
            Não deu — confere a permissão de notificações do navegador e tenta de novo.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleEnable}
        disabled={enabling}
        className="flex-none rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-orange hover:bg-white/90 disabled:opacity-60"
      >
        {enabling ? "..." : "Ativar"}
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dispensar aviso de notificações"
        className="flex-none p-1 text-white/80 hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  );
}
