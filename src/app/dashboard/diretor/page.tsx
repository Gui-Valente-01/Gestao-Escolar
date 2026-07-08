import Link from "next/link";
import { AlertTriangle, CalendarX, Sparkles, TrendingDown } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getDirectorStats, getRecentAnnouncements } from "@/services/stats.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { Badge } from "@/components/ui/Badge";
import { gradeColor, formatDate } from "@/lib/utils";

export default async function DirectorDashboard() {
  await requireRole(["ADMIN", "DIRETOR"]);
  const stats = await getDirectorStats();
  const announcements = await getRecentAnnouncements(4);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel do Diretor"
        subtitle="Indicadores gerais da escola e relatórios do Agente Gestor."
        action={
          <Link
            href="/dashboard/ia"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            <Sparkles className="h-4 w-4" /> Agente Gestor
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <DashboardCard label="Total de alunos" value={stats.students} icon="GraduationCap" tone="brand" />
        <DashboardCard label="Total de professores" value={stats.teachers} icon="Presentation" tone="amber" />
        <DashboardCard label="Total de turmas" value={stats.classes} icon="School" tone="emerald" />
        <DashboardCard
          label="Média geral da escola"
          value={stats.schoolAverage ?? "—"}
          hint="Ano letivo corrente"
          icon="Target"
          tone="violet"
        />
        <DashboardCard
          label="Frequência média"
          value={stats.attendanceRate !== null ? `${stats.attendanceRate}%` : "—"}
          hint="Presença geral da escola"
          icon="CalendarCheck"
          tone="sky"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard
            title="Desempenho por turma"
            subtitle="Média de notas de cada turma"
            type="bar"
            data={stats.averagesByClass}
            xKey="name"
            dataKeys={["media"]}
          />
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">Turmas com baixo desempenho</h3>
          </div>
          <ul className="space-y-3">
            {stats.lowClasses.length === 0 && <li className="text-sm text-slate-400">Sem dados.</li>}
            {stats.lowClasses.map((c) => (
              <li key={c.name} className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">{c.name}</span>
                <span className={`text-sm font-bold ${gradeColor(c.media)}`}>{c.media.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alunos em risco */}
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">Alunos em risco</h3>
            <Badge tone="amber">{stats.atRisk.length}</Badge>
          </div>
          <ul className="space-y-2">
            {stats.atRisk.length === 0 && <li className="text-sm text-slate-400">Nenhum aluno em risco. 🎉</li>}
            {stats.atRisk.slice(0, 6).map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.className}</p>
                </div>
                <span className={`text-sm font-bold ${gradeColor(s.media)}`}>{s.media?.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Muitas faltas */}
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarX className="h-5 w-5 text-rose-500" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">Alunos com muitas faltas</h3>
            <Badge tone="rose">{stats.manyAbsences.length}</Badge>
          </div>
          <ul className="space-y-2">
            {stats.manyAbsences.length === 0 && <li className="text-sm text-slate-400">Nenhum registro.</li>}
            {stats.manyAbsences.map((s) => (
              <li key={s.studentId} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.className}</p>
                </div>
                <Badge tone="red">{s.absences} faltas</Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Comunicados recentes */}
      <div className="card p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-white">Comunicados recentes</h3>
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
          {announcements.length === 0 && <li className="py-3 text-sm text-slate-400">Nenhum comunicado.</li>}
          {announcements.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{a.title}</p>
                <p className="text-xs text-slate-400">
                  {a.author.name} · {formatDate(a.createdAt)}
                </p>
              </div>
              <Badge tone="brand">{a.audience}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
