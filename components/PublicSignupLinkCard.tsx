"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import Card from "@/components/Card";

// Link fixo de autocadastro — o aluno preenche os dados e a anamnese
// sozinho e já recebe o acesso por e-mail, sem o personal precisar
// digitar nada.
export default function PublicSignupLinkCard() {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/cadastro` : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard pode falhar por permissão — o link já está visível pra copiar manualmente
    }
  }

  return (
    <Card className="max-w-md space-y-2 border-dashed">
      <p className="text-sm font-medium text-navy">
        Prefere que o aluno preencha sozinho (com anamnese e tudo)?
      </p>
      <p className="break-all rounded-lg bg-lightblue/10 px-3 py-2 text-sm text-blue">{url}</p>
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-sm font-medium text-orange hover:underline"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copiado!" : "Copiar link"}
      </button>
    </Card>
  );
}
