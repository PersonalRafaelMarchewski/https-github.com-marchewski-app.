"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { pendingCount, syncPendingLogs } from "@/lib/offlineLogs";

// Reenvia os registros de treino guardados no aparelho (fila offline do
// lib/offlineLogs) assim que a conexão volta: no carregamento, no evento
// "online" do navegador e num relógio de segurança a cada 30s. Enquanto
// houver pendência, mostra um selo discreto; quando esvazia, atualiza a
// tela pra tudo aparecer como salvo de verdade. Montado nos layouts de
// aluno e de personal (o modo treino usa o mesmo registro).
export default function OfflineSyncRunner() {
  const router = useRouter();
  const [pending, setPending] = useState(0);
  const syncing = useRef(false);

  useEffect(() => {
    setPending(pendingCount());

    async function trySync() {
      if (syncing.current) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      if (pendingCount() === 0) return;
      syncing.current = true;
      try {
        const { synced, remaining } = await syncPendingLogs(createClient());
        setPending(remaining);
        if (synced > 0 && remaining === 0) router.refresh();
      } finally {
        syncing.current = false;
      }
    }

    trySync();
    const onOnline = () => trySync();
    window.addEventListener("online", onOnline);
    const timer = setInterval(trySync, 30_000);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pending === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-navy px-4 py-2 text-xs font-medium text-white shadow-lg">
      <CloudUpload size={14} className="animate-pulse" />
      {pending === 1 ? "1 registro esperando internet" : `${pending} registros esperando internet`}
    </div>
  );
}
