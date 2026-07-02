import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { DisciplinasManager } from "./DisciplinasManager";

export default async function DisciplinasPage() {
  await requireRole(["ADMIN"]);
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { assignments: true } } },
  });

  const rows = subjects.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    workload: s.workload,
    teachers: s._count.assignments,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Disciplinas" subtitle="Cadastre as disciplinas oferecidas pela escola." />
      <DisciplinasManager subjects={rows} />
    </div>
  );
}
