import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { RelatoriosManager } from "./RelatoriosManager";

export default async function RelatoriosPage() {
  await requireRole(["ADMIN", "DIRETOR"]);

  const [classes, students, reports] = await Promise.all([
    prisma.class.findMany({ orderBy: [{ year: "desc" }, { name: "asc" }] }),
    prisma.student.findMany({
      include: { user: { select: { name: true } }, class: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.schoolReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { author: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios da IA"
        subtitle="Gere, salve e reabra relatórios escolares produzidos pelo Agente Gestor."
      />
      <RelatoriosManager
        classes={classes.map((c) => ({ id: c.id, name: `${c.name} (${c.year})` }))}
        students={students.map((s) => ({
          id: s.id,
          name: s.user.name,
          classId: s.classId,
          className: s.class?.name ?? null,
        }))}
        reports={reports.map((r) => ({
          id: r.id,
          title: r.title,
          scope: r.scope,
          period: r.period,
          author: r.author.name,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
