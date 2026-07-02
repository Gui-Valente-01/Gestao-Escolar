import { requireRole, getCurrentProfile } from "@/lib/auth";
import { getStudentGrades } from "@/services/student.service";
import { getStudentGradesBySubject, getStudentAverage } from "@/services/grade.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Badge } from "@/components/ui/Badge";
import { gradeColor, humanizeEnum, formatDate } from "@/lib/utils";

export default async function AlunoNotasPage() {
  await requireRole(["ADMIN", "ALUNO"]);
  const profile = await getCurrentProfile();
  if (!profile?.studentId) return <div className="card p-8 text-center text-slate-500">Perfil de aluno não encontrado.</div>;

  const [grades, bySubject, average] = await Promise.all([
    getStudentGrades(profile.studentId),
    getStudentGradesBySubject(profile.studentId),
    getStudentAverage(profile.studentId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Minhas Notas" subtitle="Acompanhe seu desempenho em cada disciplina." />

      <div className="grid gap-4 sm:grid-cols-3">
        <DashboardCard label="Média geral" value={average ?? "—"} icon="Star" tone="brand" />
        <DashboardCard label="Disciplinas" value={bySubject.length} icon="BookOpen" tone="violet" />
        <DashboardCard label="Notas lançadas" value={grades.length} icon="PencilLine" tone="emerald" />
      </div>

      <ChartCard title="Média por disciplina" type="bar" data={bySubject} xKey="subject" dataKeys={["media"]} colors={["#3366ff"]} />

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 p-4 dark:border-white/10">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white">Detalhamento das notas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-400 dark:border-white/10">
                <th className="px-4 py-3">Disciplina</th>
                <th className="px-4 py-3">Bimestre</th>
                <th className="px-4 py-3">Avaliação</th>
                <th className="px-4 py-3">Professor</th>
                <th className="px-4 py-3">Nota</th>
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {grades.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Nenhuma nota lançada.</td></tr>
              )}
              {grades.map((g) => (
                <tr key={g.id} className="border-b border-slate-100 dark:border-white/5">
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{g.subject.name}</td>
                  <td className="px-4 py-3"><Badge tone="brand">{humanizeEnum(g.term)}</Badge></td>
                  <td className="px-4 py-3 text-slate-500">{g.assessment ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{g.teacher.user.name}</td>
                  <td className={`px-4 py-3 font-bold ${gradeColor(g.value)}`}>{g.value.toFixed(1)}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(g.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
