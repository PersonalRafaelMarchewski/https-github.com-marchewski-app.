"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Meus alunos" },
  { href: "/agenda", label: "Agenda" },
  { href: "/presencas", label: "Presenças" },
  { href: "/mural", label: "Mural" },
  { href: "/financas", label: "Finanças" },
  { href: "/exercicios", label: "Exercícios" },
  { href: "/dietas", label: "Dietas" },
  { href: "/avaliacoes", label: "Avaliação física" },
  { href: "/modelos-treino", label: "Modelos de treino" },
];

export default function TrainerNav() {
  const pathname = usePathname();

  return (
    // Pílulas no mesmo estilo da navegação do aluno — um só sistema visual
    // no app inteiro. overflow-x-auto + flex-none: no celular a barra não
    // cabe toda, então rola de lado (sem barra de rolagem aparente — a
    // linha cinza que aparecia embaixo do menu era ela).
    <nav className="no-scrollbar flex gap-2 overflow-x-auto px-6 pb-3 pt-4">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex-none whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all ${
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
