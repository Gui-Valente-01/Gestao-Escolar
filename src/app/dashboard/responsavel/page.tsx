import Link from "next/link";
import { Sparkles, AlertTriangle, Bell } from "lucide-react";
import { requireRole, getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGuardianStudents } from "@/services/student.service";
import { getStudentAverage } from "@/services/grade.service";
import { getStudentAttendanceSummary } from "@/services/attendance.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime, gradeColor } from "@/lib/utils";

export default async function GuardianDashboard() {
  await requireRole(["ADMIN", "RESPONSAVEL"]);
  const profile = await getCurrentProfile();

  if (!profile?.guardianId) {
    return <div className="card p-8 text-center text-slate-500">Nenhum perfil de responsável vinculado a esta conta.</div>;
  }

  const [children, notifications] = await Promise.all([
    getGuardianStudents(profile.guardianId),
    prisma.notification.findMany({
      where: { guardianId: profile.guardianId },
      include: { student: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  const data = await Promise.all(
    children.map(async (c) => ({
      child: c,
      average: await getStudentAverage(c.id),
      attendance: await getStudentAttendanceSummary(c.id),
    })),
  );

  const alerts = data.filter((d) => (d.average !== null && d.average < 6) || d.attendance.absences >= 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel da Família"
        subtitle="Acompanhe o desempenho escolar dos seus filhos."
        action={
          <Link href="/dashboard/ia" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700">
            <Sparkles className="h-4 w-4" /> Agente Familiar
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <DashboardCard label="Filhos acompanhados" value={children.length} icon="Users" tone="brand" />
        <DashboardCard label="Alertas ativos" value={alerts.length} icon="AlertTriangle" tone="amber" />
        <DashboardCard
          label="Média da família"
          value={
            data.length
              ? (data.reduce((s, d) => s + (d.average ?? 0), 0) / data.length).toFixed(1)
              : "—"
          }
          icon="Star"
          tone="violet"
        />
      </div>

      {alerts.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-semibold">Atenção: há filhos com nota baixa ou muitas faltas.</p>
          </div>
        </div>
      )}

      {notifications.length > 0 && (
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-brand-500" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">Notificacoes recentes</h3>
            <Badge tone="brand">{notifications.length}</Badge>
          </div>
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li key={n.id} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{n.title}</p>
                  <span className="text-xs text-slate-400">{formatDateTime(n.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{n.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data.length === 0 && <div className="card p-6 text-sm text-slate-400">Nenhum aluno vinculado.</div>}
        {data.map(({ child, average, attendance }) => (
          <div key={child.id} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-800 dark:text-white">{child.user.name}</p>
                <p className="text-sm text-slate-400">{child.class?.name ?? "Sem turma"}</p>
              </div>
              {((average !== null && average < 6) || attendance.absences >= 4) && (
                <Badge tone="amber">Acompanhar</Badge>
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                <p className={`text-xl font-bold ${gradeColor(average)}`}>{average ?? "—"}</p>
                <p className="text-xs text-slate-400">Média</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                <p className="text-xl font-bold text-emerald-500">{attendance.rate}%</p>
                <p className="text-xs text-slate-400">Presença</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                <p className="text-xl font-bold text-red-500">{attendance.absences}</p>
                <p className="text-xs text-slate-400">Faltas</p>
              </div>
            </div>
            <Link
              href="/dashboard/responsavel/filhos"
              className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline"
            >
              Ver detalhes →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
