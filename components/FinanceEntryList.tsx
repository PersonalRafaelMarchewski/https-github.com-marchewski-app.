"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteFinanceEntry } from "@/app/(trainer)/financas/actions";
import { centsToBRL, type Business } from "@/lib/financeCategories";

type Item = {
  id: string;
  kind: "manual" | "stripe";
  type: "income" | "expense";
  category: string;
  description: string | null;
  amountCents: number;
  date: string;
  studentName: string | null;
  business: Business;
};

const BUSINESS_LABEL: Record<Business, string> = {
  assessoria: "Assessoria",
  personal: "Personal",
};

export default function FinanceEntryList({
  items,
  showBusinessTag = true,
}: {
  items: Item[];
  showBusinessTag?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Excluir esse lançamento?")) return;
    startTransition(async () => {
      await deleteFinanceEntry(id);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return <p className="text-sm text-blue">Nenhum lançamento nos últimos 6 meses.</p>;
  }

  return (
    <ul className="divide-y divide-lightblue/20">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-navy">
              {showBusinessTag && (
                <span className="mr-1.5 rounded-full bg-lightblue/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue">
                  {BUSINESS_LABEL[item.business]}
                </span>
              )}
              {item.category}
              {item.studentName ? ` · ${item.studentName}` : ""}
              {item.description ? ` · ${item.description}` : ""}
            </p>
            <p className="text-xs text-blue">
              {new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR")}
              {item.kind === "stripe" ? " · via Stripe" : ""}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <span
              className={`text-sm font-semibold ${item.type === "income" ? "text-navy" : "text-orange"}`}
            >
              {item.type === "income" ? "+" : "-"}
              {centsToBRL(item.amountCents)}
            </span>
            {item.kind === "manual" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => handleDelete(item.id)}
                aria-label="Excluir lançamento"
                className="rounded-lg p-1.5 text-blue hover:bg-lightblue/20 hover:text-orange disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
