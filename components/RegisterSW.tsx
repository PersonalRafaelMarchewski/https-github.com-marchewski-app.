"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // quando uma versão nova do service worker assume o controle (depois
    // de um deploy), recarrega a página uma vez só pra buscar o app
    // atualizado — sem isso, quem deixa o app aberto em segundo plano no
    // celular pode ficar preso na versão antiga por dias.
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
