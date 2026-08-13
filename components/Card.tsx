import { HTMLAttributes } from "react";

export default function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-lightblue/20 bg-white p-5 shadow-[0_2px_14px_-4px_rgba(31,37,86,0.1)] ${className}`}
      {...props}
    />
  );
}
