"use client";

import { useState } from "react";
import { Droplet } from "lucide-react";
import StudentCard from "@/components/student/StudentCard";
import { addWaterLog } from "@/app/(student)/nutricao/diario-actions";

const QUICK_AMOUNTS = [200, 300, 500];

export default function WaterTracker({
  studentId,
  initialTotalMl,
}: {
  studentId: string;
  initialTotalMl: number;
}) {
  const [totalMl, setTotalMl] = useState(initialTotalMl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(amountMl: number) {
    setError(null);
    setSaving(true);
    // otimista: soma na hora, desfaz se der erro
    setTotalMl((prev) => prev + amountMl);
    const { error: saveError } = await addWaterLog({ studentId, amountMl });
    setSaving(false);
    if (saveError) {
      setTotalMl((prev) => prev - amountMl);
      setError("Não foi possível salvar. Tenta de novo.");
    }
  }

  return (
    <StudentCard>
      <div className="flex items-center gap-2">
        <Droplet size={18} className="text-blue" />
        <div>
          <p className="text-xs font-medium text-navy">Líquidos hoje</p>
          <p className="font-heading text-lg font-bold text-navy">{totalMl}ml</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {QUICK_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => handleAdd(amount)}
            disabled={saving}
            className="flex-1 rounded-full bg-lightblue/10 py-2 text-sm font-medium text-blue hover:bg-lightblue/20 disabled:opacity-50"
          >
            +{amount}ml
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-orange">{error}</p>}
    </StudentCard>
  );
}
