import { requireRole, getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeacherAssignments } from "@/services/teacher.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { AtividadesManager } from "./AtividadesManager";

export default async function AtividadesPage() {
  await requireRole(["ADMIN", "PROFESSOR"]);
  const profile = await getCurrentProfile();

  if (!profile?.teacherId) {
    return <div className="card p-8 text-center text-slate-500">Nenhum perfil de professor vinculado.</div>;
  }

  const [assignments, activities] = await Promise.all([
    getTeacherAssignments(profile.teacherId),
    prisma.activity.findMany({
      where: { teacherId: profile.teacherId },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { class: { select: { name: true } }, subject: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Atividades e Comunicados" subtitle="Crie atividades, provas e comunicados para suas turmas." />
      <AtividadesManager
        assignments={assignments.map((a) => ({
          classId: a.class.id,
          className: `${a.class.name} (${a.class.year})`,
          subjectId: a.subject.id,
          subjectName: a.subject.name,
        }))}
        activities={activities.map((a) => ({
          id: a.id,
          title: a.title,
          type: a.type,
          className: a.class.name,
          subject: a.subject?.name ?? null,
          dueDate: a.dueDate ? a.dueDate.toISOString() : null,
        }))}
      />
    </div>
  );
}
