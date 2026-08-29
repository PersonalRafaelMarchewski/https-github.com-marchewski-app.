"use client";

import { useEffect, useState } from "react";
import { Copy, Check, ExternalLink, MessageCircle } from "lucide-react";
import Card from "@/components/Card";
import { TESTIMONIALS_PATH, testimonialsInvite } from "@/lib/links";

// Link fixo da página de depoimentos — fica em "Minha conta" pra o personal
// copiar sempre que quiser pedir um depoimento pra um aluno.
export default function TestimonialLinkCard() {
  const [copied, setCopied] = useState<"link" | "convite" | null>(null);
  // Mesmo cuidado do PublicSignupLinkCard: window só existe no navegador,
  // então o origin entra depois de montar (evita mismatch de hidratação).
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = origin ? `${origin}${TESTIMONIALS_PATH}` : "";
  const invite = testimonialsInvite(url);

  async function handleCopy(kind: "link" | "convite") {
    try {
      await navigator.clipboard.writeText(kind === "link" ? url : invite);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard pode falhar por permissão — o link já está visível pra copiar manualmente
    }
  }

  // wa.me sem número abre o seletor de contatos do WhatsApp com o texto pronto
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(invite)}`;

  return (
    <Card className="max-w-md space-y-3">
      <div>
        <h2 className="text-base font-semibold text-navy">Depoimentos dos alunos</h2>
        <p className="mt-1 text-sm text-blue">
          Manda esse link pro aluno: ele preenche o depoimento e a mensagem chega pronta no WhatsApp da assessoria.
        </p>
      </div>

      <p className="break-all rounded-lg bg-lightblue/10 px-3 py-2 text-sm text-blue">{url}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => handleCopy("link")}
          className="flex items-center gap-1.5 text-sm font-medium text-orange hover:underline"
        >
          {copied === "link" ? <Check size={14} /> : <Copy size={14} />}
          {copied === "link" ? "Copiado!" : "Copiar link"}
        </button>
        <button
          type="button"
          onClick={() => handleCopy("convite")}
          className="flex items-center gap-1.5 text-sm font-medium text-orange hover:underline"
        >
          {copied === "convite" ? <Check size={14} /> : <Copy size={14} />}
          {copied === "convite" ? "Copiado!" : "Copiar convite pronto"}
        </button>
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm font-medium text-orange hover:underline"
        >
          <MessageCircle size={14} />
          Mandar no WhatsApp
        </a>
        <a
          href={url || TESTIMONIALS_PATH}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm font-medium text-orange hover:underline"
        >
          <ExternalLink size={14} />
          Abrir página
        </a>
      </div>
    </Card>
  );
}
