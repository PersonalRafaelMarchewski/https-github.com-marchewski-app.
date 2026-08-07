import { HTMLAttributes } from "react";

// Versão do Card só pra área do aluno — mais arredondada e com sombra
// suave, pra ter uma cara mais moderna/despojada que o painel do
// personal (que continua com o Card padrão, sem mudança nenhuma).
export default function StudentCard({
  className = "",
  glow = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { glow?: boolean }) {
  return (
    <div
      className={`rounded-[28px] border border-lightblue/20 bg-white p-5 shadow-[0_4px_24px_-4px_rgba(31,37,86,0.12)] ${
        glow ? "ring-2 ring-orange/30" : ""
      } ${className}`}
      {...props}
    />
  );
}
