import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { TurmasManager } from "./TurmasManager";

export default async function TurmasPage() {
  await requireRole(["ADMIN"]);

  const [classes, teachers, subjects] = await Promise.all([
    prisma.class.findMany({
      orderBy: [{ year: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { students: true } },
        assignments: {
          include: {
            subject: { select: { name: true } },
            teacher: { include: { user: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.teacher.findMany({ include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows = classes.map((c) => ({
    id: c.id,
    name: c.name,
    year: c.year,
    shift: c.shift,
    students: c._count.students,
    assignments: c.assignments.map((a) => ({ id: a.id, subject: a.subject.name, teacher: a.teacher.user.name })),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Turmas" subtitle="Gerencie turmas e vincule professores e disciplinas." />
      <TurmasManager
        classes={rows}
        teachers={teachers.map((t) => ({ id: t.id, name: t.user.name }))}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
