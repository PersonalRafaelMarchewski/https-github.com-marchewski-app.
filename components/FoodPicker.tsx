"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

export type Food = {
  id: string;
  name: string;
  category: string | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
};

// Mesmo padrão do ExercisePicker, mas pra alimentos da Tabela TACO —
// busca por nome, sem agrupar por categoria (categorias da TACO são
// numerosas e finas demais pra virar cabeçalho útil aqui).
export default function FoodPicker({
  foods,
  onSelect,
  placeholder = "Buscar alimento (ex: arroz, frango, banana)...",
}: {
  foods: Food[];
  onSelect: (food: Food) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    ? foods.filter((f) => f.name.toLowerCase().includes(normalizedQuery)).slice(0, 40)
    : [];

  function handleSelect(food: Food) {
    onSelect(food);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-blue" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-lightblue/50 py-2 pl-8 pr-3 text-sm outline-none focus:border-orange"
        />
      </div>

      {open && normalizedQuery && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-lightblue/50 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-blue">Nenhum alimento encontrado na tabela TACO.</p>
          ) : (
            filtered.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => handleSelect(food)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-lightblue/10"
              >
                <span className="font-medium text-navy">{food.name}</span>
                {food.calories_per_100g != null && (
                  <span className="ml-1.5 text-xs text-blue">
                    · {Math.round(food.calories_per_100g)} kcal/100g
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
