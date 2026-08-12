"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/treino-do-dia", label: "Fichas" },
  { href: "/nutricao", label: "Nutrição" },
  { href: "/historico", label: "Histórico" },
  { href: "/progresso", label: "Progresso" },
  { href: "/anamnese", label: "Anamnese" },
];

export default function StudentNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-lightblue/20 bg-white px-6 py-3">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex-none rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              active
                ? "bg-gradient-to-r from-orange to-orange2 text-white shadow-[0_4px_14px_-2px_rgba(237,91,53,0.5)]"
                : "bg-lightblue/10 text-navy hover:bg-lightblue/20"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
