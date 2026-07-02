import type { Role, AgentType } from "@prisma/client";

/** Usuário autenticado (payload da sessão, sem dados sensíveis). */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** Item de navegação da sidebar. */
export interface NavItem {
  label: string;
  href: string;
  icon: string; // nome do ícone lucide-react
}

/** Resultado padrão de uma Server Action. */
export type ActionResult<T = unknown> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Configuração de um agente de IA. */
export interface AgentConfig {
  type: AgentType;
  name: string;
  roles: Role[];
  description: string;
  systemPrompt: string;
}

/** Card de estatística do dashboard. */
export interface StatCard {
  label: string;
  value: string | number;
  hint?: string;
  icon: string;
  tone?: "brand" | "emerald" | "amber" | "red" | "violet";
}
