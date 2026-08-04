"use client";

import { useActionState, useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { createCheckoutSession, type CreateChargeState } from "@/app/(trainer)/alunos/[id]/pagamentos/actions";

const initialState: CreateChargeState = { error: null, url: null };

export default function PaymentForm({ studentId }: { studentId: string }) {
  const boundAction = createCheckoutSession.bind(null, studentId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!state.url) return;
    await navigator.clipboard.writeText(state.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (state.url) {
    return (
      <Card className="space-y-3">
        <p className="text-sm text-navy">
          Link de pagamento gerado. Envie pro aluno (WhatsApp, etc):
        </p>
        <div className="rounded-lg bg-lightblue/10 p-3">
          <p className="break-all font-mono text-xs text-navy">{state.url}</p>
        </div>
        <Button type="button" variant="secondary" onClick={handleCopy} className="w-full">
          {copied ? "Copiado!" : "Copiar link"}
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Tipo de cobrança</label>
          <select
            name="type"
            defaultValue="subscription"
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          >
            <option value="subscription">Mensalidade recorrente</option>
            <option value="one_time">Pagamento único</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Valor (R$)</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="1"
            placeholder="150.00"
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Descrição</label>
          <input
            name="description"
            placeholder="Assessoria esportiva — mensalidade"
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        <p className="text-xs text-blue">
          Pagamento único aceita cartão e Pix. Mensalidade recorrente aceita cartão.
        </p>

        {state.error && <p className="text-sm text-orange">{state.error}</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Gerando..." : "Gerar cobrança"}
        </Button>
      </form>
    </Card>
  );
}
