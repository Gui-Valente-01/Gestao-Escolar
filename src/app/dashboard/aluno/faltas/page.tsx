import { requireRole, getCurrentProfile } from "@/lib/auth";
import { getStudentAttendance } from "@/services/student.service";
import { getStudentAttendanceSummary } from "@/services/attendance.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

export default async function AlunoFaltasPage() {
  await requireRole(["ADMIN", "ALUNO"]);
  const profile = await getCurrentProfile();
  if (!profile?.studentId) return <div className="card p-8 text-center text-slate-500">Perfil de aluno não encontrado.</div>;

  const [records, summary] = await Promise.all([
    getStudentAttendance(profile.studentId),
    getStudentAttendanceSummary(profile.studentId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Minhas Faltas" subtitle="Acompanhe sua frequência escolar." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Presença" value={`${summary.rate}%`} icon="CalendarCheck" tone="emerald" />
        <DashboardCard label="Total de registros" value={summary.total} icon="CalendarDays" tone="brand" />
        <DashboardCard label="Faltas" value={summary.absences} icon="CalendarX" tone="red" />
        <DashboardCard label="Faltas justificadas" value={summary.justified} icon="FileCheck" tone="amber" />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 p-4 dark:border-white/10">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white">Histórico de frequência</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-400 dark:border-white/10">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Disciplina</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3">Observação</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">Nenhum registro de frequência.</td></tr>
              )}
              {records.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-white/5">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 text-slate-500">{r.subject?.name ?? "Geral"}</td>
                  <td className="px-4 py-3">
                    {r.present ? (
                      <Badge tone="emerald">Presente</Badge>
                    ) : r.justified ? (
                      <Badge tone="amber">Falta justificada</Badge>
                    ) : (
                      <Badge tone="red">Falta</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{r.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
