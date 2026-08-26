"use client";

import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import Card from "@/components/Card";

// Links fixos de autocadastro — o aluno preenche os dados e a anamnese
// sozinho e já recebe o acesso por e-mail, sem o personal precisar
// digitar nada. Um link por tipo: /cadastro entra como assessoria,
// /cadastro/personal entra como personal (presencial).
export default function PublicSignupLinkCard() {
  const [copied, setCopied] = useState<string | null>(null);
  // Começa vazio nos dois lados (servidor não tem window) e só preenche
  // depois de montar no navegador — calcular `window.location.origin`
  // direto no render dava mismatch de hidratação (servidor renderiza ""
  // e o cliente já renderiza a URL cheia de cara), que o Next acusava
  // como "Recoverable Error" no console.
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const links = [
    { label: "Assessoria (online)", url: origin ? `${origin}/cadastro` : "" },
    { label: "Personal (presencial)", url: origin ? `${origin}/cadastro/personal` : "" },
  ];

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard pode falhar por permissão — o link já está visível pra copiar manualmente
    }
  }

  return (
    <Card className="max-w-md space-y-3 border-dashed">
      <p className="text-sm font-medium text-navy">
        Prefere que o aluno preencha sozinho (com anamnese e tudo)? Manda o link do tipo certo:
      </p>
      {links.map((l) => (
        <div key={l.label}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue">{l.label}</p>
          <p className="break-all rounded-lg bg-lightblue/10 px-3 py-2 text-sm text-blue">{l.url}</p>
          <button
            type="button"
            onClick={() => handleCopy(l.url)}
            className="mt-1 flex items-center gap-1.5 text-sm font-medium text-orange hover:underline"
          >
            {copied === l.url ? <Check size={14} /> : <Copy size={14} />}
            {copied === l.url ? "Copiado!" : "Copiar link"}
          </button>
        </div>
      ))}
    </Card>
  );
}
