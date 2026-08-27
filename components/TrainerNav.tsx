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
    // overflow-x-auto + flex-none nos links: no celular a barra não cabe
    // tudo (Meus alunos/Agenda/Finanças/Exercícios/Dietas), então em vez
    // de cortar "Dietas" pra fora da tela sem dar pra alcançar, ela vira
    // scrollável horizontalmente (arrasta com o dedo, como uma barra de
    // abas nativa)
    <nav className="flex gap-1 overflow-x-auto border-b border-lightblue/30 bg-white px-6">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex-none border-b-2 whitespace-nowrap px-3 py-3 text-sm font-medium ${
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
