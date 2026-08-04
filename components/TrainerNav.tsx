"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Meus alunos" },
  { href: "/exercicios", label: "Exercícios" },
];

export default function TrainerNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-lightblue/30 bg-white px-6">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`border-b-2 px-3 py-3 text-sm font-medium ${
              active ? "border-orange text-navy" : "border-transparent text-blue hover:text-navy"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
