import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseTableParams } from "@/lib/pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfessoresManager } from "./ProfessoresManager";
import type { Prisma } from "@prisma/client";

export default async function ProfessoresPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  await requireRole(["ADMIN"]);
  const { page, pageSize, skip, query } = parseTableParams(searchParams);
  const where: Prisma.TeacherWhereInput = query
    ? {
        OR: [
          { registration: { contains: query } },
          { phone: { contains: query } },
          { user: { name: { contains: query } } },
          { user: { email: { contains: query } } },
        ],
      }
    : {};

  const [teachers, total] = await Promise.all([
    prisma.teacher.findMany({
      where,
      orderBy: { user: { name: "asc" } },
      skip,
      take: pageSize,
      include: { user: { select: { name: true, email: true } }, _count: { select: { assignments: true } } },
    }),
    prisma.teacher.count({ where }),
  ]);

  const rows = teachers.map((t) => ({
    id: t.id,
    name: t.user.name,
    email: t.user.email,
    registration: t.registration,
    phone: t.phone,
    subjects: t._count.assignments,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Professores" subtitle="Cadastre e gerencie o corpo docente." />
      <ProfessoresManager teachers={rows} query={query} pagination={{ page, pageSize, total }} />
    </div>
  );
}
