"use client";

import { useEffect } from "react";
import { markMuralSeen } from "@/app/(student)/recados/actions";

// Sem render — só dispara a marca de "visto" quando o aluno abre o
// mural, pra bolinha de não lido sumir da navegação.
export default function MarkMuralSeen() {
  useEffect(() => {
    markMuralSeen();
  }, []);
  return null;
}
