"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu } from "lucide-react";
import type { SessionUser } from "@/types";
import { ROLE_LABELS, ROLE_BADGE } from "@/lib/permissions";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

export function Navbar({ user, onMenuClick }: { user: SessionUser; onMenuClick: () => void }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/10 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">
            Olá, {user.name.split(" ")[0]} 👋
          </p>
          <p className="text-xs text-slate-400">Bem-vindo(a) à plataforma EduGestão IA</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={cn("hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline-flex", ROLE_BADGE[user.role])}>
          {ROLE_LABELS[user.role]}
        </span>
        <ThemeToggle />
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label="Sair da conta"
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-red-500/10 hover:text-red-600 disabled:opacity-60 dark:text-slate-300"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
