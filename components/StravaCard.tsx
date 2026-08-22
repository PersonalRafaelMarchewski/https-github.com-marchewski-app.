"use client";

import { useState } from "react";
import { Activity, Check } from "lucide-react";
import StudentCard from "@/components/student/StudentCard";
import { disconnectStrava } from "@/app/(student)/perfil/actions";

// Cartão do Strava no perfil do aluno: conectar (vai pro OAuth) ou
// mostrar que está conectado, com opção de desconectar. Só é montado
// quando as chaves do Strava existem no servidor (o perfil nem renderiza
// isso sem elas) — padrão Turnstile de recurso opcional.
export default function StravaCard({
  connected,
  feedbackQuery,
}: {
  connected: boolean;
  // ?strava=ok|erro|cancelado vindo do callback — mostra o aviso uma vez
  feedbackQuery: string | null;
}) {
  const [disconnecting, setDisconnecting] = useState(false);

  return (
    <StudentCard>
      <div className="mb-2 flex items-center gap-2">
        <Activity size={18} className="flex-none text-orange" />
        <p className="text-sm font-medium text-navy">Strava</p>
        {connected && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-orange/15 px-2.5 py-0.5 text-xs font-semibold text-orange">
            <Check size={12} strokeWidth={3} />
            Conectado
          </span>
        )}
      </div>

      {feedbackQuery === "ok" && (
        <p className="mb-3 rounded-lg bg-orange/10 px-3 py-2 text-sm text-navy">
          Strava conectado! Seus treinos de rua agora marcam o cardio da ficha
          sozinhos.
        </p>
      )}
      {feedbackQuery === "erro" && (
        <p className="mb-3 rounded-lg bg-orange/10 px-3 py-2 text-sm text-orange">
          Não deu pra conectar agora. Tenta de novo em instantes.
        </p>
      )}

      {connected ? (
        <>
          <p className="mb-3 text-sm text-blue">
            Quando você registrar uma corrida, pedal ou caminhada no Strava, o
            cardio do dia na sua ficha é marcado como feito automaticamente.
          </p>
          <button
            type="button"
            disabled={disconnecting}
            onClick={async () => {
              setDisconnecting(true);
              try {
                await disconnectStrava();
              } finally {
                setDisconnecting(false);
              }
            }}
            className="text-sm text-blue hover:underline disabled:opacity-50"
          >
            {disconnecting ? "Desconectando..." : "Desconectar do Strava"}
          </button>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-blue">
            Conecte sua conta e o treino de rua (corrida, pedal, caminhada)
            marca o cardio da sua ficha sozinho — sem precisar registrar duas
            vezes.
          </p>
          <a
            href="/api/strava/connect"
            className="inline-flex items-center gap-2 rounded-xl bg-[#FC4C02] px-4 py-2.5 font-heading text-sm font-semibold text-white shadow-[0_4px_14px_-4px_rgba(252,76,2,0.5)] hover:brightness-110"
          >
            <Activity size={16} />
            Conectar com Strava
          </a>
        </>
      )}
    </StudentCard>
  );
}
