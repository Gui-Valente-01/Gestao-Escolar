import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseTableParams } from "@/lib/pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResponsaveisManager } from "./ResponsaveisManager";
import type { Prisma } from "@prisma/client";

export default async function ResponsaveisPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  await requireRole(["ADMIN"]);
  const { page, pageSize, skip, query } = parseTableParams(searchParams);
  const where: Prisma.GuardianWhereInput = query
    ? {
        OR: [
          { phone: { contains: query } },
          { cpf: { contains: query } },
          { user: { name: { contains: query } } },
          { user: { email: { contains: query } } },
        ],
      }
    : {};

  const [guardians, total] = await Promise.all([
    prisma.guardian.findMany({
      where,
      orderBy: { user: { name: "asc" } },
      skip,
      take: pageSize,
      include: { user: { select: { name: true, email: true } }, _count: { select: { students: true } } },
    }),
    prisma.guardian.count({ where }),
  ]);

  const rows = guardians.map((g) => ({
    id: g.id,
    name: g.user.name,
    email: g.user.email,
    phone: g.phone,
    cpf: g.cpf,
    students: g._count.students,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Responsáveis" subtitle="Cadastre os responsáveis e vincule-os aos alunos." />
      <ResponsaveisManager guardians={rows} query={query} pagination={{ page, pageSize, total }} />
    </div>
  );
}
