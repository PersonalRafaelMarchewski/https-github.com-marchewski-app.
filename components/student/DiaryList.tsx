"use client";

import StudentCard from "@/components/student/StudentCard";
import DeleteButton from "@/components/DeleteButton";
import { sumMacros } from "@/lib/nutrition";
import { formatTimeInBrazil } from "@/lib/date";
import { deleteDiaryEntry } from "@/app/(student)/nutricao/diario-actions";
import type { SavedDiaryEntry } from "@/components/student/DiaryEntryForm";

export default function DiaryList({
  entries,
  onDeleted,
}: {
  entries: SavedDiaryEntry[];
  onDeleted: (entryId: string) => void;
}) {
  if (entries.length === 0) {
    return (
      <p className="py-2 text-center text-sm text-blue">
        Nada registrado no diário ainda hoje.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const macros = sumMacros(entry.items);
        return (
          <StudentCard key={entry.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-navy">{entry.label || "Registro"}</p>
                <span className="text-xs text-blue">{formatTimeInBrazil(entry.logged_at)}</span>
              </div>
              <p className="truncate text-sm text-blue">
                {entry.items.map((it) => it.food_name).join(", ")}
              </p>
              <p className="mt-1 text-xs text-blue">
                {macros.calories} kcal · P {macros.protein}g · C {macros.carbs}g · G {macros.fat}g
              </p>
            </div>
            <DeleteButton
              action={async () => {
                const { error } = await deleteDiaryEntry(entry.id);
                if (error) throw new Error(error);
                onDeleted(entry.id);
              }}
              confirmMessage="Apagar esse registro do diário?"
            />
          </StudentCard>
        );
      })}
    </div>
  );
}
