import Link from "next/link";
import { Sparkles, FileDown, ScrollText } from "lucide-react";
import { requireRole, getCurrentProfile } from "@/lib/auth";
import { getStudentContext, getStudentActivities } from "@/services/student.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { Badge } from "@/components/ui/Badge";
import { formatDate, gradeColor } from "@/lib/utils";

export default async function StudentDashboard() {
  await requireRole(["ADMIN", "ALUNO"]);
  const profile = await getCurrentProfile();

  if (!profile?.studentId) {
    return (
      <div className="card p-8 text-center text-slate-500">
        Nenhum perfil de aluno vinculado a esta conta.
      </div>
    );
  }

  const ctx = await getStudentContext(profile.studentId);
  const activities = await getStudentActivities(profile.studentId);
  if (!ctx) return <div className="card p-8 text-center">Dados do aluno não encontrados.</div>;

  const { student, average, bySubject, byTerm, attendance } = ctx;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Olá, ${student.user.name.split(" ")[0]}!`}
        subtitle={`Turma: ${student.class?.name ?? "Sem turma"} · Matrícula ${student.registration}`}
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/boletim/${profile.studentId}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
            >
              <FileDown className="h-4 w-4" /> Baixar boletim
            </a>
            <a
              href={`/api/comprovante/${profile.studentId}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
            >
              <ScrollText className="h-4 w-4" /> Comprovante de matrícula
            </a>
            <Link href="/dashboard/ia" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700">
              <Sparkles className="h-4 w-4" /> Tutor IA
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Minha média" value={average ?? "—"} icon="Star" tone="brand" />
        <DashboardCard label="Presença" value={`${attendance.rate}%`} icon="CalendarCheck" tone="emerald" />
        <DashboardCard label="Faltas" value={attendance.absences} icon="CalendarX" tone="red" />
        <DashboardCard label="Atividades" value={activities.length} icon="FileText" tone="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Evolução por bimestre" subtitle="Sua média ao longo do ano" type="area" data={byTerm} xKey="name" dataKeys={["media"]} />
        <ChartCard title="Notas por disciplina" subtitle="Média atual em cada matéria" type="bar" data={bySubject} xKey="subject" dataKeys={["media"]} colors={["#8b5cf6"]} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-white">Atividades pendentes</h3>
          <ul className="space-y-2">
            {activities.length === 0 && <li className="text-sm text-slate-400">Nenhuma atividade no momento.</li>}
            {activities.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{a.title}</p>
                  <p className="text-xs text-slate-400">{a.subject?.name ?? "Geral"} · entrega {formatDate(a.dueDate)}</p>
                </div>
                <Badge tone="brand">{a.type}</Badge>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-white">Ocorrências registradas</h3>
          <ul className="space-y-2">
            {student.occurrences.length === 0 && <li className="text-sm text-slate-400">Nenhuma ocorrência. 👏</li>}
            {student.occurrences.map((o) => (
              <li key={o.id} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <Badge tone={o.severity === "ALTA" ? "red" : o.severity === "MEDIA" ? "amber" : "slate"}>{o.type}</Badge>
                  <span className="text-xs text-slate-400">{formatDate(o.date)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{o.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Dica: use as páginas <span className={gradeColor(average)}>Minhas notas</span> e Minhas faltas no menu para ver o detalhamento completo.
      </p>
    </div>
  );
}
