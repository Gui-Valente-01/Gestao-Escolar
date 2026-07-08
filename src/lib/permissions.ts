import type { Role } from "@prisma/client";
import type { NavItem } from "@/types";

// ----------------------------------------------------------------------------
// Rótulos e identidade visual de cada perfil
// ----------------------------------------------------------------------------

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  DIRETOR: "Diretor",
  PEDAGOGA: "Pedagoga",
  PROFESSOR: "Professor",
  ALUNO: "Aluno",
  RESPONSAVEL: "Responsável",
};

export const ROLE_BADGE: Record<Role, string> = {
  ADMIN: "bg-violet-500/15 text-violet-500",
  DIRETOR: "bg-brand-500/15 text-brand-500",
  PEDAGOGA: "bg-emerald-500/15 text-emerald-500",
  PROFESSOR: "bg-amber-500/15 text-amber-600",
  ALUNO: "bg-sky-500/15 text-sky-500",
  RESPONSAVEL: "bg-rose-500/15 text-rose-500",
};

export const ALL_ROLES: Role[] = [
  "ADMIN",
  "DIRETOR",
  "PEDAGOGA",
  "PROFESSOR",
  "ALUNO",
  "RESPONSAVEL",
];

// ----------------------------------------------------------------------------
// Página inicial (home) de cada perfil após o login
// ----------------------------------------------------------------------------

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/dashboard/admin",
  DIRETOR: "/dashboard/diretor",
  PEDAGOGA: "/dashboard/pedagoga",
  PROFESSOR: "/dashboard/professor",
  ALUNO: "/dashboard/aluno",
  RESPONSAVEL: "/dashboard/responsavel",
};

// ----------------------------------------------------------------------------
// Controle de acesso por prefixo de rota
// Cada entrada define quais roles podem acessar aquele ramo do dashboard.
// ----------------------------------------------------------------------------

const ROUTE_RULES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/dashboard/admin", roles: ["ADMIN"] },
  { prefix: "/dashboard/diretor", roles: ["ADMIN", "DIRETOR"] },
  { prefix: "/dashboard/pedagoga", roles: ["ADMIN", "DIRETOR", "PEDAGOGA"] },
  { prefix: "/dashboard/professor", roles: ["ADMIN", "PROFESSOR"] },
  { prefix: "/dashboard/aluno", roles: ["ADMIN", "ALUNO"] },
  { prefix: "/dashboard/responsavel", roles: ["ADMIN", "RESPONSAVEL"] },
  { prefix: "/dashboard/financeiro", roles: [] },
  // /dashboard e /dashboard/ia são liberados para qualquer usuário autenticado
];

/** Verifica se a role pode acessar a rota informada. */
export function canAccessRoute(role: Role, pathname: string): boolean {
  const rule = ROUTE_RULES.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return true; // rotas genéricas do dashboard
  return rule.roles.includes(role);
}

// ----------------------------------------------------------------------------
// Permissões granulares (usadas em Server Actions e componentes)
// ----------------------------------------------------------------------------

export const PERMISSIONS = {
  manageUsers: (r: Role) => r === "ADMIN",
  manageAcademic: (r: Role) => r === "ADMIN", // turmas, disciplinas, vínculos
  viewSchoolReports: (r: Role) => r === "ADMIN" || r === "DIRETOR",
  manageSchoolReports: (r: Role) => r === "ADMIN" || r === "DIRETOR",
  managePedagogy: (r: Role) => r === "ADMIN" || r === "PEDAGOGA",
  launchGrades: (r: Role) => r === "ADMIN" || r === "PROFESSOR",
  createAnnouncements: (r: Role) =>
    ["ADMIN", "DIRETOR", "PEDAGOGA", "PROFESSOR"].includes(r),
  registerOccurrences: (r: Role) =>
    ["ADMIN", "DIRETOR", "PEDAGOGA", "PROFESSOR"].includes(r),
  manageEvents: (r: Role) =>
    ["ADMIN", "DIRETOR", "PEDAGOGA", "PROFESSOR"].includes(r),
  manageFinance: (_r: Role) => false,
} as const;

// ----------------------------------------------------------------------------
// Navegação dinâmica da sidebar por perfil
// ----------------------------------------------------------------------------

const NAV_PROFILE: NavItem[] = [
  { label: "Meu perfil", href: "/dashboard/perfil", icon: "UserCog" },
];

const NAV_IA: NavItem = { label: "Assistente IA", href: "/dashboard/ia", icon: "Sparkles" };
const NAV_CALENDAR: NavItem = { label: "Calendário", href: "/dashboard/calendario", icon: "CalendarDays" };
const NAV_MESSAGES: NavItem = { label: "Mensagens", href: "/dashboard/mensagens", icon: "MessageSquare" };
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: "Visão geral", href: "/dashboard/admin", icon: "LayoutDashboard" },
    ...NAV_PROFILE,
    { label: "Usuários", href: "/dashboard/admin/usuarios", icon: "Users" },
    { label: "Alunos", href: "/dashboard/admin/alunos", icon: "GraduationCap" },
    { label: "Professores", href: "/dashboard/admin/professores", icon: "Presentation" },
    { label: "Responsáveis", href: "/dashboard/admin/responsaveis", icon: "UserRound" },
    { label: "Turmas", href: "/dashboard/admin/turmas", icon: "School" },
    { label: "Disciplinas", href: "/dashboard/admin/disciplinas", icon: "BookOpen" },
    { label: "Relatórios IA", href: "/dashboard/diretor/relatorios", icon: "FileSearch" },
    NAV_CALENDAR,
    NAV_MESSAGES,
    NAV_IA,
  ],
  DIRETOR: [
    { label: "Visão geral", href: "/dashboard/diretor", icon: "LayoutDashboard" },
    ...NAV_PROFILE,
    { label: "Relatórios IA", href: "/dashboard/diretor/relatorios", icon: "FileSearch" },
    NAV_CALENDAR,
    NAV_MESSAGES,
    NAV_IA,
  ],
  PEDAGOGA: [
    { label: "Visão geral", href: "/dashboard/pedagoga", icon: "LayoutDashboard" },
    ...NAV_PROFILE,
    { label: "Fichas dos alunos", href: "/dashboard/pedagoga/alunos", icon: "UserRound" },
    { label: "Acompanhamentos", href: "/dashboard/pedagoga/acompanhamentos", icon: "ClipboardList" },
    NAV_CALENDAR,
    NAV_MESSAGES,
    NAV_IA,
  ],
  PROFESSOR: [
    { label: "Visão geral", href: "/dashboard/professor", icon: "LayoutDashboard" },
    ...NAV_PROFILE,
    { label: "Meus alunos", href: "/dashboard/professor/alunos", icon: "Users" },
    { label: "Notas", href: "/dashboard/professor/notas", icon: "PencilLine" },
    { label: "Frequência", href: "/dashboard/professor/frequencia", icon: "CalendarCheck" },
    { label: "Atividades", href: "/dashboard/professor/atividades", icon: "FileText" },
    NAV_CALENDAR,
    NAV_MESSAGES,
    NAV_IA,
  ],
  ALUNO: [
    { label: "Visão geral", href: "/dashboard/aluno", icon: "LayoutDashboard" },
    ...NAV_PROFILE,
    { label: "Minhas notas", href: "/dashboard/aluno/notas", icon: "Star" },
    { label: "Minhas faltas", href: "/dashboard/aluno/faltas", icon: "CalendarX" },
    NAV_CALENDAR,
    NAV_MESSAGES,
    NAV_IA,
  ],
  RESPONSAVEL: [
    { label: "Visão geral", href: "/dashboard/responsavel", icon: "LayoutDashboard" },
    ...NAV_PROFILE,
    { label: "Meus filhos", href: "/dashboard/responsavel/filhos", icon: "Users" },
    NAV_CALENDAR,
    NAV_MESSAGES,
    NAV_IA,
  ],
};
