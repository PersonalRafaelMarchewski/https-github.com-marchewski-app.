import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export default function Button({ variant = "primary", className = "", ...props }: Props) {
  const base =
    "rounded-xl px-4 py-2.5 font-heading font-semibold transition-all disabled:opacity-50 disabled:shadow-none active:scale-[0.98]";
  const styles =
    variant === "primary"
      ? "bg-orange text-white shadow-[0_4px_14px_-4px_rgba(237,91,53,0.45)] hover:bg-orange2 hover:shadow-[0_6px_18px_-4px_rgba(237,91,53,0.55)]"
      : "bg-navy text-white shadow-[0_4px_14px_-4px_rgba(31,37,86,0.35)] hover:bg-blue hover:shadow-[0_6px_18px_-4px_rgba(31,37,86,0.4)]";

  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
