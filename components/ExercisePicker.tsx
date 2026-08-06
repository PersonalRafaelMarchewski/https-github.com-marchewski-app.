"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

type Exercise = { id: string; name: string; muscle_group?: string | null };

export default function ExercisePicker({
  exercises,
  value,
  onChange,
  placeholder = "Buscar exercício...",
}: {
  exercises: Exercise[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = exercises.find((e) => e.id === value) ?? null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? exercises.filter(
        (e) =>
          e.name.toLowerCase().includes(normalizedQuery) ||
          (e.muscle_group ?? "").toLowerCase().includes(normalizedQuery)
      )
    : exercises;

  // Agrupa por grupo muscular (mantendo a ordem em que os grupos aparecem
  // na lista) — assim, buscar por um grupo já mostra todos os exercícios
  // dele organizados debaixo do nome do grupo.
  const grouped = useMemo(() => {
    const map = new Map<string, Exercise[]>();
    for (const ex of filtered) {
      const key = (ex.muscle_group ?? "").trim() || "Outros";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ex);
    }
    return [...map.entries()];
  }, [filtered]);

  function handleSelect(ex: Exercise) {
    onChange(ex.id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-blue" />
        <input
          type="text"
          value={open ? query : (selected?.name ?? "")}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          placeholder={placeholder}
          className="w-full rounded-lg border border-lightblue/50 py-2 pl-8 pr-3 text-sm outline-none focus:border-orange"
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-lightblue/50 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-blue">Nenhum exercício encontrado.</p>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group}>
                <p className="sticky top-0 bg-lightblue/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue">
                  {group}
                </p>
                {items.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => handleSelect(ex)}
                    className={`block w-full px-3 py-2 text-left text-sm font-medium leading-snug text-navy hover:bg-lightblue/10 ${
                      ex.id === value ? "bg-orange/10" : ""
                    }`}
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
