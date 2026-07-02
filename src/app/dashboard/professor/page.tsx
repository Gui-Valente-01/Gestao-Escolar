import Link from "next/link";
import { PencilLine, CalendarCheck, FileText, Sparkles } from "lucide-react";
import { requireRole, getCurrentProfile } from "@/lib/auth";
import {
  getTeacherClasses,
  getTeacherSubjects,
  getTeacherStudents,
  getTeacherClassPerformance,
} from "@/services/teacher.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ChartCard } from "@/components/dashboard/ChartCard";

export default async function TeacherDashboard() {
  await requireRole(["ADMIN", "PROFESSOR"]);
  const profile = await getCurrentProfile();

  if (!profile?.teacherId) {
    return <div className="card p-8 text-center text-slate-500">Nenhum perfil de professor vinculado a esta conta.</div>;
  }

  const [classes, subjects, students, performance] = await Promise.all([
    getTeacherClasses(profile.teacherId),
    getTeacherSubjects(profile.teacherId),
    getTeacherStudents(profile.teacherId),
    getTeacherClassPerformance(profile.teacherId),
  ]);

  const actions = [
    { href: "/dashboard/professor/notas", label: "Lançar notas", icon: PencilLine, tone: "bg-brand-600" },
    { href: "/dashboard/professor/frequencia", label: "Registrar frequência", icon: CalendarCheck, tone: "bg-emerald-600" },
    { href: "/dashboard/professor/atividades", label: "Criar atividade", icon: FileText, tone: "bg-violet-600" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel do Professor"
        subtitle="Suas turmas, alunos e ferramentas de ensino."
        action={
          <Link href="/dashboard/ia" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700">
            <Sparkles className="h-4 w-4" /> Agente Professor
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <DashboardCard label="Minhas turmas" value={classes.length} icon="School" tone="brand" />
        <DashboardCard label="Minhas disciplinas" value={subjects.length} icon="BookOpen" tone="amber" />
        <DashboardCard label="Meus alunos" value={students.length} icon="GraduationCap" tone="emerald" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className={`flex items-center gap-3 rounded-2xl ${a.tone} p-4 text-white shadow-sm transition hover:opacity-90`}>
            <a.icon className="h-6 w-6" />
            <span className="font-medium">{a.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Desempenho das minhas turmas" subtitle="Média das notas que você lançou" type="bar" data={performance} xKey="name" dataKeys={["media"]} />
        </div>
        <div className="card p-5">
          <h3 className="mb-3 text-base font-semibold text-slate-800 dark:text-white">Minhas turmas</h3>
          <ul className="space-y-2">
            {classes.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-white/5">
                <span className="font-medium text-slate-700 dark:text-slate-200">{c.name}</span>
                <span className="text-xs text-slate-400">{c.year}</span>
              </li>
            ))}
            {classes.length === 0 && <li className="text-sm text-slate-400">Nenhuma turma vinculada.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
