"use client";

import { useState } from "react";
import { Send, Check } from "lucide-react";

// "Avisar aluno das mudanças" nas edições de treino e dieta: o personal
// edita à vontade e, quando terminar, um toque dispara UM push limpo pro
// aluno + registra o aviso no mural dele (a notificação some, o post
// fica). Evita a metralhadora de avisos a cada campo mexido.
export default function NotifyStudentButton({
  action,
  label = "Avisar aluno das mudanças",
}: {
  action: () => Promise<void>;
  label?: string;
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSending(true);
    setError(null);
    try {
      await action();
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível avisar agora.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <span className="flex items-center justify-center gap-1.5 rounded-lg border border-lightblue/50 px-3 py-1.5 text-sm font-medium text-navy">
        <Check size={16} className="text-orange" />
        Aluno avisado
      </span>
    );
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={sending}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-orange px-3 py-1.5 text-sm font-medium text-white hover:bg-orange2 disabled:opacity-50"
      >
        <Send size={15} />
        {sending ? "Avisando..." : label}
      </button>
      {error && <span className="text-xs text-orange">{error}</span>}
    </span>
  );
}
