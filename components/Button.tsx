import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export default function Button({ variant = "primary", className = "", ...props }: Props) {
  const base = "rounded-lg px-4 py-2.5 font-heading font-semibold transition-colors disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-orange text-white hover:bg-orange2"
      : "bg-navy text-white hover:bg-blue";

  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
