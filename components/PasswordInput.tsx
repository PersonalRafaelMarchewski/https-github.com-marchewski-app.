"use client";

import { useState, InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

// Campo de senha com botão de mostrar/esconder — usado tanto no login
// quanto nas telas de trocar/redefinir senha, pro personal e pro aluno.
export default function PasswordInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`w-full pr-10 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Esconder senha" : "Mostrar senha"}
        className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-blue hover:text-navy md:w-12"
      >
        {visible ? <EyeOff className="size-[18px] md:size-6" /> : <Eye className="size-[18px] md:size-6" />}
      </button>
    </div>
  );
}
