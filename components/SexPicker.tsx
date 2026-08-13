"use client";

export default function SexPicker({
  name = "sex",
  value,
  onChange,
}: {
  name?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const options = [
    { value: "F", label: "Feminino" },
    { value: "M", label: "Masculino" },
  ];

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="flex gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              value === o.value
                ? "border-orange bg-orange text-white"
                : "border-lightblue/50 text-navy hover:border-orange/50"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
