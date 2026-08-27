import { HTMLAttributes } from "react";

export default function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-lightblue/25 bg-white p-5 shadow-[0_1px_2px_rgba(31,37,86,0.05),0_10px_28px_-10px_rgba(31,37,86,0.14)] ${className}`}
      {...props}
    />
  );
}
