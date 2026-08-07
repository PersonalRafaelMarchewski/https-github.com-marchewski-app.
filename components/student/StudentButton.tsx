import { ButtonHTMLAttributes } from "react";

// Botão só da área do aluno: formato de pílula + gradiente, mais
// "despojado" que o botão padrão (retangular) usado no painel do personal.
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export default function StudentButton({ variant = "primary", className = "", ...props }: Props) {
  const base =
    "rounded-full px-5 py-3 font-heading font-semibold transition-all disabled:opacity-50 active:scale-[0.98]";
  const styles =
    variant === "primary"
      ? "bg-gradient-to-r from-orange to-orange2 text-white shadow-[0_6px_20px_-4px_rgba(237,91,53,0.5)] hover:shadow-[0_8px_24px_-4px_rgba(237,91,53,0.6)]"
      : variant === "secondary"
        ? "bg-navy text-white shadow-[0_6px_20px_-4px_rgba(31,37,86,0.4)]"
        : "bg-lightblue/10 text-navy hover:bg-lightblue/20";

  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
