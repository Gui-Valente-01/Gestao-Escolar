import { FileDown } from "lucide-react";
import { requireRole, getCurrentProfile } from "@/lib/auth";
import { getGuardianStudents, getStudentContext } from "@/services/student.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { gradeColor, formatDate, humanizeEnum } from "@/lib/utils";

export default async function FilhosPage() {
  await requireRole(["ADMIN", "RESPONSAVEL"]);
  const profile = await getCurrentProfile();
  if (!profile?.guardianId) return <div className="card p-8 text-center text-slate-500">Perfil de responsável não encontrado.</div>;

  const children = await getGuardianStudents(profile.guardianId);
  const contexts = await Promise.all(children.map((c) => getStudentContext(c.id)));

  return (
    <div className="space-y-6">
      <PageHeader title="Meus Filhos" subtitle="Veja notas, faltas e ocorrências de cada aluno vinculado." />

      {contexts.filter(Boolean).length === 0 && (
        <div className="card p-8 text-center text-slate-400">Nenhum aluno vinculado a você.</div>
      )}

      {contexts.map((ctx) => {
        if (!ctx) return null;
        const { student, average, bySubject, attendance } = ctx;
        return (
          <div key={student.id} className="card p-6">
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{student.user.name}</h2>
                <p className="text-sm text-slate-400">{student.class?.name ?? "Sem turma"} · Matrícula {student.registration}</p>
                <a
                  href={`/api/boletim/${student.id}`}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  <FileDown className="h-3.5 w-3.5" /> Baixar boletim (PDF)
                </a>
              </div>
              <div className="flex gap-3 text-center">
                <div>
                  <p className={`text-2xl font-bold ${gradeColor(average)}`}>{average ?? "—"}</p>
                  <p className="text-xs text-slate-400">Média</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-500">{attendance.rate}%</p>
                  <p className="text-xs text-slate-400">Presença</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">{attendance.absences}</p>
                  <p className="text-xs text-slate-400">Faltas</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Notas por disciplina</h3>
                <ul className="space-y-1.5">
                  {bySubject.length === 0 && <li className="text-sm text-slate-400">Sem notas lançadas.</li>}
                  {bySubject.map((s) => (
                    <li key={s.subject} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm dark:bg-white/5">
                      <span className="text-slate-600 dark:text-slate-300">{s.subject}</span>
                      <span className={`font-bold ${gradeColor(s.media)}`}>{s.media.toFixed(1)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Ocorrências</h3>
                <ul className="space-y-1.5">
                  {student.occurrences.length === 0 && <li className="text-sm text-slate-400">Nenhuma ocorrência. 👏</li>}
                  {student.occurrences.map((o) => (
                    <li key={o.id} className="rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-white/5">
                      <div className="flex items-center justify-between">
                        <Badge tone={o.severity === "ALTA" ? "red" : o.severity === "MEDIA" ? "amber" : "slate"}>{humanizeEnum(o.type)}</Badge>
                        <span className="text-xs text-slate-400">{formatDate(o.date)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{o.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
