"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/treino-do-dia", label: "Fichas" },
  { href: "/nutricao", label: "Nutrição" },
  { href: "/historico", label: "Histórico" },
  { href: "/progresso", label: "Progresso" },
  { href: "/recados", label: "Mural" },
  { href: "/foto", label: "Foto" },
  { href: "/anamnese", label: "Anamnese" },
];

export default function StudentNav() {
  const pathname = usePathname();

  return (
    // no-scrollbar cobre também Chrome/Safari — o scrollbarWidth inline
    // só escondia a barra no Firefox
    <nav className="no-scrollbar flex gap-2 overflow-x-auto px-6 pb-3 pt-4">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex-none rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              active
                ? "bg-gradient-to-r from-orange to-orange2 text-white shadow-[0_4px_14px_-2px_rgba(237,91,53,0.5)]"
                : "bg-white text-navy shadow-sm hover:bg-lightblue/10"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
