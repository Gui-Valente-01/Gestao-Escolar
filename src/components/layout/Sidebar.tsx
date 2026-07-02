"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { GraduationCap } from "lucide-react";
import type { NavItem, SessionUser } from "@/types";
import { ROLE_LABELS } from "@/lib/permissions";
import { cn, initials } from "@/lib/utils";

interface SidebarProps {
  items: NavItem[];
  user: SessionUser;
  onNavigate?: () => void;
}

export function Sidebar({ items, user, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-72 flex-col bg-white dark:bg-surface-dark">
      {/* Marca */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-glow">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-slate-800 dark:text-white">EduGestão</p>
          <p className="gradient-text text-sm font-bold">IA</p>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = (Icons[item.icon as keyof typeof Icons] ?? Icons.Circle) as Icons.LucideIcon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5",
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-white" : "text-slate-400 group-hover:text-brand-500")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Usuário */}
      <div className="border-t border-slate-200 p-4 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-bold text-white">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
