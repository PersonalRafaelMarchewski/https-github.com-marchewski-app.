"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Settings, KeyRound } from "lucide-react";
import NotificationButton from "@/components/NotificationButton";
import SignOutButton from "@/components/SignOutButton";

// Mesmo padrão do TrainerAccountMenu: agrupa notificações, alterar senha e
// sair num único menu, em vez de deixar tudo solto no cabeçalho.
export default function StudentAccountMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Configurações da conta"
        aria-expanded={open}
        className="flex items-center justify-center rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
      >
        <Settings size={20} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-xl border border-lightblue/30 bg-white py-1.5 shadow-lg"
        >
          <div className="px-3 py-2">
            <NotificationButton className="flex items-center gap-2 text-sm text-navy hover:text-orange disabled:opacity-50" />
          </div>
          <Link
            href="/perfil"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-navy hover:bg-lightblue/10"
          >
            <KeyRound size={16} />
            Alterar senha
          </Link>
          <div className="px-3 py-2">
            <SignOutButton className="flex items-center gap-2 text-sm text-navy hover:text-orange" />
          </div>
        </div>
      )}
    </div>
  );
}
