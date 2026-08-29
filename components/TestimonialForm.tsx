"use client";

import { useState } from "react";
import { Check, Copy, Star } from "lucide-react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { trainerWhatsAppUrl } from "@/lib/whatsapp";
import { saveTestimonial } from "@/app/depoimentos/actions";

// Formulário público de depoimento. Monta a mensagem e abre o WhatsApp da
// assessoria com ela pronta — o aluno só aperta enviar. Antes disso, grava
// o depoimento no banco (aba "Depoimentos" do personal) em best-effort:
// se a gravação falhar, o WhatsApp abre do mesmo jeito. "Copiar o texto" é
// o plano B pra quando o wa.me não abre (desktop sem WhatsApp, navegador
// bloqueando redirecionamento) — e também grava.

const TEMPOS = [
  "Menos de 3 meses",
  "De 3 a 6 meses",
  "De 6 meses a 1 ano",
  "De 1 a 2 anos",
  "Mais de 2 anos",
];

const NOTAS: Record<number, string> = {
  1: "Ruim",
  2: "Regular",
  3: "Bom",
  4: "Muito bom",
  5: "Excelente",
};

const MAX = 600;

export default function TestimonialForm({ initialName = "" }: { initialName?: string }) {
  const [nome, setNome] = useState(initialName);
  const [tempo, setTempo] = useState("");
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [texto, setTexto] = useState("");
  const [autoriza, setAutoriza] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // grava uma vez só, mesmo que a pessoa clique em enviar e depois copiar
  const [gravado, setGravado] = useState(false);

  async function gravar() {
    if (gravado) return;
    try {
      const { saved } = await saveTestimonial({
        displayName: nome,
        trainingTime: tempo,
        rating: nota,
        body: texto,
        authorized: autoriza,
      });
      if (saved) setGravado(true);
    } catch {
      // best-effort: o WhatsApp segue sendo o canal principal
    }
  }

  function validar(): boolean {
    const faltam: string[] = [];
    if (!nome.trim()) faltam.push("seu nome");
    if (!tempo) faltam.push("há quanto tempo treina");
    if (!nota) faltam.push("a nota");
    if (texto.trim().length < 20) faltam.push("um depoimento com pelo menos 20 caracteres");
    if (faltam.length) {
      setErro(`Falta preencher: ${faltam.join(", ")}.`);
      setAviso(null);
      return false;
    }
    setErro(null);
    return true;
  }

  function montarMensagem(): string {
    return [
      "Olá, Rafael! Aqui vai o meu depoimento:",
      "",
      `Nome: ${nome.trim()}`,
      `Tempo de treino: ${tempo}`,
      `Nota: ${"★".repeat(nota)} (${nota}/5, ${NOTAS[nota]})`,
      "",
      texto.trim(),
      "",
      autoriza
        ? "Autorizo o uso do depoimento e do meu primeiro nome no site e redes sociais."
        : "Prefiro que o depoimento não seja divulgado publicamente.",
    ].join("\n");
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!validar() || enviando) return;
    setEnviando(true);
    setAviso("Enviando...");
    await gravar();
    setEnviando(false);
    setAviso(
      'Abrindo o WhatsApp com a sua mensagem pronta. Se não abrir, use "Copiar o texto" e cole na conversa com o Rafael.'
    );
    window.location.href = trainerWhatsAppUrl(montarMensagem());
  }

  async function copiar() {
    if (!validar()) return;
    void gravar();
    try {
      await navigator.clipboard.writeText(montarMensagem());
      setCopied(true);
      setAviso("Texto copiado. Cole na conversa do WhatsApp com o Rafael: (15) 99161-6955.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErro("Não deu para copiar automaticamente. Selecione o texto do depoimento e copie manualmente.");
    }
  }

  const notaVisivel = hover || nota;
  const fieldClass =
    "w-full rounded-lg border border-lightblue/50 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange";

  return (
    <Card className="mx-auto max-w-lg">
      <form onSubmit={enviar} noValidate className="space-y-5">
        <div>
          <label htmlFor="nome" className="mb-1 block text-sm font-medium text-navy">
            Seu nome
          </label>
          <input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="name"
            placeholder="Como você quer aparecer"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="tempo" className="mb-1 block text-sm font-medium text-navy">
            Há quanto tempo treina com o Rafael?
          </label>
          <select
            id="tempo"
            value={tempo}
            onChange={(e) => setTempo(e.target.value)}
            className={fieldClass}
          >
            <option value="" disabled>
              Escolha uma opção
            </option>
            {TEMPOS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="mb-1 text-sm font-medium text-navy">Como você avalia o acompanhamento?</legend>
          <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNota(n)}
                onMouseEnter={() => setHover(n)}
                aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
                aria-pressed={nota === n}
                className="rounded-md p-1 transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  size={32}
                  className={n <= notaVisivel ? "fill-orange text-orange" : "text-lightblue/60"}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-blue">{nota ? `${nota} de 5 · ${NOTAS[nota]}` : ""}</span>
          </div>
        </fieldset>

        <div>
          <label htmlFor="texto" className="mb-1 block text-sm font-medium text-navy">
            Seu depoimento
          </label>
          <p className="mb-2 text-xs text-blue">
            Pode ser simples: o que mudou na sua rotina, no seu corpo ou na sua disposição desde que começou.
          </p>
          <textarea
            id="texto"
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, MAX))}
            rows={6}
            placeholder="Escreva do seu jeito, sem pressa."
            className={`${fieldClass} resize-y`}
          />
          <p className="mt-1 text-right text-xs text-lightblue">
            {texto.length}/{MAX}
          </p>
        </div>

        <label className="flex items-start gap-3 text-sm text-navy">
          <input
            type="checkbox"
            checked={autoriza}
            onChange={(e) => setAutoriza(e.target.checked)}
            className="mt-0.5 h-5 w-5 flex-none accent-orange"
          />
          <span>
            Autorizo o uso do meu depoimento e do meu primeiro nome no site e nas redes sociais da
            Marchewski Assessoria Esportiva.
          </span>
        </label>

        {erro && <p className="text-sm text-orange">{erro}</p>}
        {aviso && !erro && (
          <p className="rounded-lg bg-lightblue/10 px-3 py-2 text-sm text-navy">{aviso}</p>
        )}

        <div className="space-y-2">
          <Button type="submit" disabled={enviando} className="w-full">
            {enviando ? "Enviando..." : "Enviar pelo WhatsApp"}
          </Button>
          <button
            type="button"
            onClick={copiar}
            className="flex w-full items-center justify-center gap-1.5 py-2 text-sm font-medium text-orange hover:underline"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copiado!" : "Copiar o texto"}
          </button>
        </div>
      </form>
    </Card>
  );
}
