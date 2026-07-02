import { requireRole, getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeacherAssignments } from "@/services/teacher.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { NotasManager } from "./NotasManager";

export default async function NotasPage() {
  await requireRole(["ADMIN", "PROFESSOR"]);
  const profile = await getCurrentProfile();

  if (!profile?.teacherId) {
    return <div className="card p-8 text-center text-slate-500">Nenhum perfil de professor vinculado.</div>;
  }

  const assignments = await getTeacherAssignments(profile.teacherId);
  const classIds = Array.from(new Set(assignments.map((a) => a.class.id)));

  const [studentsRaw, grades] = await Promise.all([
    prisma.student.findMany({
      where: { classId: { in: classIds } },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.grade.findMany({
      where: { teacherId: profile.teacherId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { student: { include: { user: { select: { name: true } } } }, subject: { select: { name: true } } },
    }),
  ]);

  const studentsByClass: Record<string, { id: string; name: string }[]> = {};
  for (const s of studentsRaw) {
    if (!s.classId) continue;
    (studentsByClass[s.classId] ??= []).push({ id: s.id, name: s.user.name });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Lançamento de Notas" subtitle="Registre as notas dos alunos das suas turmas." />
      <NotasManager
        assignments={assignments.map((a) => ({
          classId: a.class.id,
          className: `${a.class.name} (${a.class.year})`,
          subjectId: a.subject.id,
          subjectName: a.subject.name,
        }))}
        studentsByClass={studentsByClass}
        grades={grades.map((g) => ({
          id: g.id,
          student: g.student.user.name,
          subject: g.subject.name,
          term: g.term,
          value: g.value,
          year: g.year,
          createdAt: g.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
