import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "brand" | "emerald" | "amber" | "red" | "violet" | "sky";

const tones: Record<Tone, string> = {
  brand: "from-brand-500/20 to-brand-500/5 text-brand-600 dark:text-brand-300",
  emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
  amber: "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400",
  red: "from-red-500/20 to-red-500/5 text-red-600 dark:text-red-400",
  violet: "from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-400",
  sky: "from-sky-500/20 to-sky-500/5 text-sky-600 dark:text-sky-400",
};

interface DashboardCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: string;
  tone?: Tone;
}

export function DashboardCard({ label, value, hint, icon, tone = "brand" }: DashboardCardProps) {
  // Resolve dinamicamente o ícone lucide pelo nome
  const Icon = (Icons[icon as keyof typeof Icons] ?? Icons.Activity) as Icons.LucideIcon;
  return (
    <div className="card group p-5 transition hover:shadow-glow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-800 dark:text-white">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br transition group-hover:scale-110",
            tones[tone],
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
