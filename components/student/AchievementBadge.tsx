export default function AchievementBadge({
  emoji,
  label,
  achieved,
  size = "md",
}: {
  emoji: string;
  label: string;
  achieved: boolean;
  size?: "sm" | "md";
}) {
  const tileSize = size === "sm" ? "h-14 w-14 text-2xl" : "h-16 w-16 text-3xl";

  return (
    <div className="flex w-20 flex-col items-center gap-1.5 text-center">
      <div
        className={`flex ${tileSize} items-center justify-center rounded-3xl transition-all ${
          achieved
            ? "bg-gradient-to-br from-orange to-peach shadow-[0_6px_18px_-4px_rgba(237,91,53,0.55)]"
            : "bg-lightblue/10 grayscale opacity-40"
        }`}
      >
        {emoji}
      </div>
      <p className={`text-[11px] leading-tight ${achieved ? "font-semibold text-navy" : "text-blue/70"}`}>
        {label}
      </p>
    </div>
  );
}
