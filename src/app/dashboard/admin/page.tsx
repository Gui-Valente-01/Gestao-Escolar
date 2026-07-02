import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getAdminStats } from "@/services/stats.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ChartCard } from "@/components/dashboard/ChartCard";

export default async function AdminDashboard() {
  await requireRole(["ADMIN"]);
  const stats = await getAdminStats();

  const quickLinks = [
    { href: "/dashboard/admin/usuarios", label: "Usuários", icon: "Users" },
    { href: "/dashboard/admin/alunos", label: "Alunos", icon: "GraduationCap" },
    { href: "/dashboard/admin/professores", label: "Professores", icon: "Presentation" },
    { href: "/dashboard/admin/turmas", label: "Turmas", icon: "School" },
    { href: "/dashboard/admin/disciplinas", label: "Disciplinas", icon: "BookOpen" },
    { href: "/dashboard/admin/responsaveis", label: "Responsáveis", icon: "UserRound" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Painel do Administrador" subtitle="Visão geral e gestão completa do sistema escolar." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Usuários" value={stats.users} icon="Users" tone="brand" />
        <DashboardCard label="Alunos" value={stats.students} icon="GraduationCap" tone="sky" />
        <DashboardCard label="Professores" value={stats.teachers} icon="Presentation" tone="amber" />
        <DashboardCard label="Responsáveis" value={stats.guardians} icon="UserRound" tone="violet" />
        <DashboardCard label="Turmas" value={stats.classes} icon="School" tone="emerald" />
        <DashboardCard label="Disciplinas" value={stats.subjects} icon="BookOpen" tone="brand" />
        <DashboardCard label="Interações com IA" value={stats.aiCount} icon="Sparkles" tone="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Usuários por perfil"
          subtitle="Distribuição de acessos no sistema"
          type="bar"
          data={stats.usersByRole}
          xKey="name"
          dataKeys={["total"]}
        />
        <ChartCard
          title="Alunos por turma"
          subtitle="Quantidade de matriculados em cada turma"
          type="bar"
          data={stats.studentsByClass}
          xKey="name"
          dataKeys={["alunos"]}
          colors={["#10b981"]}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Acesso rápido</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="card flex items-center justify-between p-4 transition hover:shadow-glow"
            >
              <span className="font-medium text-slate-700 dark:text-slate-200">{l.label}</span>
              <ArrowRight className="h-4 w-4 text-brand-500" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
