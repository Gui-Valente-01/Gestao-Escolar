import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseTableParams } from "@/lib/pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { UsuariosManager } from "./UsuariosManager";
import type { Prisma } from "@prisma/client";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  await requireRole(["ADMIN"]);
  const { page, pageSize, skip, query } = parseTableParams(searchParams);
  const where: Prisma.UserWhereInput = query
    ? {
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ]);

  const rows = users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }));

  return (
    <div className="space-y-6">
      <PageHeader title="Usuários" subtitle="Gerencie todas as contas e perfis de acesso." />
      <UsuariosManager users={rows} query={query} pagination={{ page, pageSize, total }} />
    </div>
  );
}
