"use client";

import { useActionState, useState } from "react";
import { Star, MessageCircle, Copy, Check } from "lucide-react";
import StudentCard from "@/components/student/StudentCard";
import Button from "@/components/Button";
import { submitTestimonial, type TestimonialState } from "@/app/(student)/depoimento/actions";
import {
  TRAINING_TIME_OPTIONS,
  RATING_LABELS as NOTAS,
  TRAINER_WHATSAPP as WHATSAPP,
  buildTestimonialMessage as montarMensagem,
} from "@/lib/testimonials";

const initialState: TestimonialState = { error: null, success: null };

export default function TestimonialForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, pending] = useActionState(submitTestimonial, initialState);
  // campos controlados: um erro de validação não apaga o que foi escrito
  const [displayName, setDisplayName] = useState(defaultName);
  const [trainingTime, setTrainingTime] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [copied, setCopied] = useState(false);

  if (state.success) {
    const msg = montarMensagem(state.success);
    return (
      <StudentCard glow className="space-y-4">
        <h2 className="text-xl font-bold text-navy">Depoimento enviado! 🙌</h2>
        <p className="text-sm text-navy">
          Obrigado, {state.success.displayName.split(" ")[0]}! O Rafael já recebeu. Se quiser, manda
          também direto no WhatsApp dele:
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 font-heading font-semibold text-white hover:brightness-95"
          >
            <MessageCircle size={18} />
            Mandar no WhatsApp
          </a>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(msg);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                // sem permissão de clipboard — o texto está visível abaixo
              }
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-lightblue/50 px-4 py-2.5 text-sm font-medium text-navy hover:bg-lightblue/10"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copiado!" : "Copiar o texto"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap rounded-xl bg-lightblue/10 p-3 text-xs text-navy">{msg}</pre>
      </StudentCard>
    );
  }

  const shown = hover || rating;

  return (
    <StudentCard>
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="rating" value={rating || ""} />

        <div>
          <label className="mb-1 block text-sm font-semibold text-navy">Seu nome</label>
          <input
            name="display_name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Como você quer aparecer"
            autoComplete="name"
            required
            className="w-full rounded-xl border border-lightblue/50 px-3 py-2.5 outline-none focus:border-orange"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-navy">
            Há quanto tempo treina com o Rafael?
          </label>
          <select
            name="training_time"
            value={trainingTime}
            onChange={(e) => setTrainingTime(e.target.value)}
            required
            className="w-full rounded-xl border border-lightblue/50 px-3 py-2.5 outline-none focus:border-orange"
          >
            <option value="" disabled>
              Escolha uma opção
            </option>
            {TRAINING_TIME_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-navy">Como você avalia o acompanhamento?</p>
          <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
                className="rounded-lg p-1 transition-transform active:scale-95"
              >
                <Star
                  size={34}
                  className={shown >= n ? "text-[#E8A81C]" : "text-lightblue/60"}
                  fill={shown >= n ? "#E8A81C" : "none"}
                />
              </button>
            ))}
          </div>
          <p className="mt-1 min-h-5 text-xs text-blue">
            {rating ? `${rating} de 5 · ${NOTAS[rating]}` : ""}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-navy">Seu depoimento</label>
          <p className="mb-1.5 text-xs text-blue">
            Pode ser simples: o que mudou na sua rotina, no seu corpo ou na sua disposição desde que
            começou.
          </p>
          <textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 600))}
            rows={6}
            required
            placeholder="Escreva do seu jeito, sem pressa."
            className="w-full rounded-xl border border-lightblue/50 px-3 py-2.5 outline-none focus:border-orange"
          />
          <p className="text-right text-xs text-blue">{body.length}/600</p>
        </div>

        <label className="flex items-start gap-3 text-sm text-navy">
          <input
            type="checkbox"
            name="authorized"
            checked={authorized}
            onChange={(e) => setAuthorized(e.target.checked)}
            className="mt-0.5 h-5 w-5 flex-none accent-orange"
          />
          <span>
            Autorizo o uso do meu depoimento e do meu primeiro nome no site e nas redes sociais da
            Marchewski Assessoria Esportiva.
          </span>
        </label>

        {state.error && (
          <p className="rounded-lg bg-orange/10 px-3 py-2 text-sm font-medium text-orange">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Enviando..." : "Enviar depoimento"}
        </Button>
      </form>
    </StudentCard>
  );
}
