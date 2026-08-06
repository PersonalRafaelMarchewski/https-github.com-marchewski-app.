"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";

// iOS não faz "puxar pra atualizar" nativo quando o app roda instalado
// (modo standalone) — esse componente reproduz o gesto manualmente.
const PULL_THRESHOLD = 70; // px de puxada pra disparar o refresh
const MAX_PULL = 100; // resistência máxima visual

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);

  function handleTouchStart(e: React.TouchEvent) {
    if (window.scrollY > 0 || pending) {
      startYRef.current = null;
      pullingRef.current = false;
      return;
    }
    startYRef.current = e.touches[0].clientY;
    pullingRef.current = true;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!pullingRef.current || startYRef.current === null) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta <= 0 || window.scrollY > 0) {
      pullingRef.current = false;
      setPullDistance(0);
      return;
    }
    setPullDistance(Math.min(delta * 0.5, MAX_PULL));
  }

  function handleTouchEnd() {
    if (!pullingRef.current) return;
    pullingRef.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      startTransition(() => {
        router.refresh();
      });
    }
    setPullDistance(0);
  }

  const displayHeight = pending ? PULL_THRESHOLD : pullDistance;

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: displayHeight }}
      >
        <RefreshCw
          size={20}
          className={`text-blue ${pending ? "animate-spin" : ""}`}
          style={{
            transform: pending ? undefined : `rotate(${(pullDistance / PULL_THRESHOLD) * 360}deg)`,
            opacity: Math.min(displayHeight / PULL_THRESHOLD, 1),
          }}
        />
      </div>
      {children}
    </div>
  );
}
