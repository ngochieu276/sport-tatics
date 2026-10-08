import { cn } from "@/lib/utils";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-xl", light ? "text-line" : "text-foreground")}>
      <svg viewBox="0 0 24 32" className="h-8 w-6" aria-hidden="true">
        <rect x="1" y="1" width="22" height="30" rx="2" fill={light ? "#1c7a4a" : "#123c28"} />
        <path d="M6 1v30M18 1v30M1 16h22" stroke="#e7f6ee" strokeWidth="1.4" />
      </svg>
      SportTactic
    </span>
  );
}
