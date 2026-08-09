"use client";

import { GripVertical } from "lucide-react";

// As "três linhas" pra segurar e arrastar. Só esse botão captura o toque —
// o resto do card não é afetado, então a página continua rolando normal.
export default function DragHandle({
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  className = "",
}: {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerCancel?: (e: React.PointerEvent) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      aria-label="Arrastar pra reordenar"
      className={`flex flex-none touch-none cursor-grab items-center justify-center self-stretch px-1 text-lightblue hover:text-navy active:cursor-grabbing ${className}`}
    >
      <GripVertical size={18} />
    </button>
  );
}
