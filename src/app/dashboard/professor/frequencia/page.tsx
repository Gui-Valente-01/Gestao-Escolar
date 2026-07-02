import { requireRole, getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeacherAssignments } from "@/services/teacher.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { FrequenciaManager } from "./FrequenciaManager";

export default async function FrequenciaPage() {
  await requireRole(["ADMIN", "PROFESSOR"]);
  const profile = await getCurrentProfile();

  if (!profile?.teacherId) {
    return <div className="card p-8 text-center text-slate-500">Nenhum perfil de professor vinculado.</div>;
  }

  const assignments = await getTeacherAssignments(profile.teacherId);
  const classIds = Array.from(new Set(assignments.map((a) => a.class.id)));

  const studentsRaw = await prisma.student.findMany({
    where: { classId: { in: classIds } },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const studentsByClass: Record<string, { id: string; name: string }[]> = {};
  for (const s of studentsRaw) {
    if (!s.classId) continue;
    (studentsByClass[s.classId] ??= []).push({ id: s.id, name: s.user.name });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Registro de Frequência" subtitle="Faça a chamada e registre presenças e faltas." />
      <FrequenciaManager
        assignments={assignments.map((a) => ({
          classId: a.class.id,
          className: `${a.class.name} (${a.class.year})`,
          subjectId: a.subject.id,
          subjectName: a.subject.name,
        }))}
        studentsByClass={studentsByClass}
      />
    </div>
  );
}
