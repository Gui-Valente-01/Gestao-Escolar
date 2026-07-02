"use client";

import { useState, type ReactNode } from "react";
import type { NavItem, SessionUser } from "@/types";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { cn } from "@/lib/utils";

export function DashboardShell({
  user,
  nav,
  children,
}: {
  user: SessionUser;
  nav: NavItem[];
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-light dark:bg-surface-darker">
      {/* Sidebar fixa (desktop) */}
      <div className="hidden border-r border-slate-200 dark:border-white/10 lg:block">
        <div className="sticky top-0 h-screen">
          <Sidebar items={nav} user={user} />
        </div>
      </div>

      {/* Sidebar móvel (off-canvas) */}
      <div className={cn("fixed inset-0 z-40 lg:hidden", mobileOpen ? "" : "pointer-events-none")}>
        <div
          className={cn(
            "absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={cn(
            "absolute left-0 top-0 h-full border-r border-slate-200 shadow-xl transition-transform dark:border-white/10",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar items={nav} user={user} onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar user={user} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 animate-fade-in p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
