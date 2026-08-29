"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

// Botão "copiar" genérico (texto de depoimento, mensagem pronta etc.)
export default function CopyTextButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // sem permissão de clipboard — o texto continua visível na tela
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-lg border border-lightblue/50 px-2.5 py-1.5 text-xs font-medium text-navy hover:bg-lightblue/10"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copiado!" : label}
    </button>
  );
}
