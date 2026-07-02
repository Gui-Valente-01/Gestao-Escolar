import Link from "next/link";
import { Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentsAtRisk, getRecentOccurrences } from "@/services/stats.service";
import { getAveragesByClass } from "@/services/grade.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { Badge } from "@/components/ui/Badge";
import { formatDate, gradeColor } from "@/lib/utils";

export default async function PedagogueDashboard() {
  await requireRole(["ADMIN", "DIRETOR", "PEDAGOGA"]);

  const [students, atRisk, occurrences, averagesByClass, openFollowUps, recentFollowUps] =
    await Promise.all([
      prisma.student.count(),
      getStudentsAtRisk(6),
      getRecentOccurrences(5),
      getAveragesByClass(),
      prisma.pedagogicalFollowUp.count({ where: { status: { not: "CONCLUIDO" } } }),
      prisma.pedagogicalFollowUp.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { student: { include: { user: { select: { name: true } } } } },
      }),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel Pedagógico"
        subtitle="Acompanhamento dos alunos, planos de apoio e ocorrências."
        action={
          <Link href="/dashboard/ia" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700">
            <Sparkles className="h-4 w-4" /> Agente Pedagógico
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Total de alunos" value={students} icon="GraduationCap" tone="brand" />
        <DashboardCard label="Alunos em risco" value={atRisk.length} icon="AlertTriangle" tone="amber" />
        <DashboardCard label="Acompanhamentos abertos" value={openFollowUps} icon="ClipboardList" tone="violet" />
        <DashboardCard label="Ocorrências recentes" value={occurrences.length} icon="FileWarning" tone="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Médias por turma" subtitle="Identifique turmas que precisam de atenção" type="bar" data={averagesByClass} xKey="name" dataKeys={["media"]} colors={["#10b981"]} />
        </div>
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">Alunos em risco</h3>
            <Link href="/dashboard/pedagoga/acompanhamentos" className="text-xs font-medium text-brand-600 hover:underline">Ver todos</Link>
          </div>
          <ul className="space-y-2">
            {atRisk.length === 0 && <li className="text-sm text-slate-400">Nenhum aluno em risco. 🎉</li>}
            {atRisk.slice(0, 6).map((s) => (
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-white">Acompanhamentos recentes</h3>
          <ul className="space-y-2">
            {recentFollowUps.length === 0 && <li className="text-sm text-slate-400">Nenhum acompanhamento.</li>}
            {recentFollowUps.map((f) => (
              <li key={f.id} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{f.student.user.name}</p>
                  <Badge tone={f.status === "CONCLUIDO" ? "emerald" : f.status === "EM_ANDAMENTO" ? "amber" : "slate"}>{f.status}</Badge>
                </div>
                <p className="text-xs text-slate-400">{f.title} · {formatDate(f.createdAt)}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-white">Ocorrências recentes</h3>
          <ul className="space-y-2">
            {occurrences.length === 0 && <li className="text-sm text-slate-400">Nenhuma ocorrência.</li>}
            {occurrences.map((o) => (
              <li key={o.id} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{o.student.user.name}</p>
                  <Badge tone={o.severity === "ALTA" ? "red" : o.severity === "MEDIA" ? "amber" : "slate"}>{o.type}</Badge>
                </div>
                <p className="text-xs text-slate-400">{formatDate(o.date)} · por {o.reportedBy.name}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
