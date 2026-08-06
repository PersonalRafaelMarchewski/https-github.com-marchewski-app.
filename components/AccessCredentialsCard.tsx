"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function AccessCredentialsCard({
  email,
  password,
  title = "Compartilhe esse acesso com o aluno (WhatsApp, etc):",
}: {
  email: string;
  password: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);
  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "";

  const message = `Acesse o app: ${loginUrl}\nE-mail: ${email}\nSenha: ${password}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard pode falhar por permissão — sem problema, o texto já
      // está visível na tela pra copiar manualmente
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-navy">{title}</p>
      <div className="space-y-1.5 rounded-lg bg-lightblue/10 p-4 text-sm">
        <p>
          <span className="font-semibold text-navy">Link:</span>{" "}
          <span className="break-all text-blue">{loginUrl}</span>
        </p>
        <p>
          <span className="font-semibold text-navy">E-mail:</span> {email}
        </p>
        <p>
          <span className="font-semibold text-navy">Senha:</span>{" "}
          <span className="font-mono">{password}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-sm font-medium text-orange hover:underline"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copiado!" : "Copiar tudo"}
      </button>
    </div>
  );
}
