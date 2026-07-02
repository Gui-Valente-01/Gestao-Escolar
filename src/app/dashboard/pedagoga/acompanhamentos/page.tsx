import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listStudents } from "@/services/student.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { AcompanhamentosManager } from "./AcompanhamentosManager";

export default async function AcompanhamentosPage() {
  await requireRole(["ADMIN", "DIRETOR", "PEDAGOGA"]);

  const [students, followUps, occurrences] = await Promise.all([
    listStudents(),
    prisma.pedagogicalFollowUp.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { student: { include: { user: { select: { name: true } } } } },
    }),
    prisma.occurrence.findMany({
      orderBy: { date: "desc" },
      take: 20,
      include: { student: { include: { user: { select: { name: true } } } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Acompanhamento Pedagógico" subtitle="Registre planos de apoio, observações e ocorrências dos alunos." />
      <AcompanhamentosManager
        students={students.map((s) => ({ id: s.id, name: s.user.name, className: s.class?.name ?? "Sem turma" }))}
        followUps={followUps.map((f) => ({
          id: f.id,
          student: f.student.user.name,
          title: f.title,
          notes: f.notes,
          plan: f.plan,
          status: f.status,
          createdAt: f.createdAt.toISOString(),
        }))}
        occurrences={occurrences.map((o) => ({
          id: o.id,
          student: o.student.user.name,
          type: o.type,
          severity: o.severity,
          description: o.description,
          date: o.date.toISOString(),
        }))}
      />
    </div>
  );
}
