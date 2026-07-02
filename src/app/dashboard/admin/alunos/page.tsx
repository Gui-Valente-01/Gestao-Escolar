import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseTableParams } from "@/lib/pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlunosManager } from "./AlunosManager";
import type { Prisma } from "@prisma/client";

export default async function AlunosPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  await requireRole(["ADMIN"]);
  const { page, pageSize, skip, query } = parseTableParams(searchParams);
  const where: Prisma.StudentWhereInput = query
    ? {
        OR: [
          { registration: { contains: query } },
          { user: { name: { contains: query } } },
          { user: { email: { contains: query } } },
          { class: { name: { contains: query } } },
          { guardian: { user: { name: { contains: query } } } },
        ],
      }
    : {};

  const [students, total, classes, guardians] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: { user: { name: "asc" } },
      skip,
      take: pageSize,
      include: {
        user: { select: { name: true, email: true } },
        class: { select: { id: true, name: true } },
        guardian: { include: { user: { select: { name: true } } } },
      },
    }),
    prisma.student.count({ where }),
    prisma.class.findMany({ orderBy: [{ year: "desc" }, { name: "asc" }] }),
    prisma.guardian.findMany({ include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);

  const rows = students.map((s) => ({
    id: s.id,
    name: s.user.name,
    email: s.user.email,
    registration: s.registration,
    birthDate: s.birthDate ? s.birthDate.toISOString() : null,
    className: s.class?.name ?? null,
    classId: s.class?.id ?? null,
    guardianName: s.guardian?.user.name ?? null,
    guardianId: s.guardianId,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Alunos" subtitle="Cadastre alunos e vincule-os a turmas e responsáveis." />
      <AlunosManager
        students={rows}
        classes={classes.map((c) => ({ id: c.id, name: `${c.name} (${c.year})` }))}
        guardians={guardians.map((g) => ({ id: g.id, name: g.user.name }))}
        query={query}
        pagination={{ page, pageSize, total }}
      />
    </div>
  );
}
