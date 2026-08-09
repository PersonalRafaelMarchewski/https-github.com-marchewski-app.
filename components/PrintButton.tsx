"use client";

import { FileDown } from "lucide-react";

// Usa a impressão do navegador (o aluno/personal escolhe "Salvar como PDF"
// no diálogo) — sem precisar de nenhuma biblioteca de geração de PDF. O CSS
// de impressão em globals.css já esconde o cabeçalho/menu do app.
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print flex items-center gap-1.5 rounded-lg border border-lightblue/50 px-3 py-1.5 text-sm font-medium text-navy hover:bg-lightblue/10"
    >
      <FileDown size={16} />
      Baixar PDF
    </button>
  );
}
