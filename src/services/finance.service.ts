import { prisma } from "@/lib/prisma";
import type { Prisma, Role } from "@prisma/client";

interface ProfileLike {
  id: string;
  role: Role;
  guardianId?: string | null;
}

/** Lista de faturas de acordo com o perfil (gestão vê todas; responsável só dos filhos). */
export async function listInvoices(profile: ProfileLike) {
  let where: Prisma.InvoiceWhereInput;
  if (profile.role === "ADMIN" || profile.role === "DIRETOR") {
    where = {};
  } else if (profile.role === "RESPONSAVEL" && profile.guardianId) {
    where = { student: { guardianId: profile.guardianId } };
  } else {
    return [];
  }

  return prisma.invoice.findMany({
    where,
    include: {
      student: {
        include: { user: { select: { name: true } }, class: { select: { name: true } } },
      },
    },
    orderBy: [{ dueDate: "desc" }],
  });
}

/** Resumo financeiro para o painel da gestão. */
export async function getFinanceSummary() {
  const invoices = await prisma.invoice.findMany({ select: { amount: true, status: true, dueDate: true } });
  const now = new Date();
  const summary = { pending: 0, paid: 0, overdue: 0, pendingCount: 0, paidCount: 0, overdueCount: 0, total: invoices.length };

  for (const i of invoices) {
    if (i.status === "PAGO") {
      summary.paid += i.amount;
      summary.paidCount += 1;
    } else if (i.status !== "CANCELADO") {
      summary.pending += i.amount;
      summary.pendingCount += 1;
      if (i.status === "ATRASADO" || i.dueDate < now) {
        summary.overdue += i.amount;
        summary.overdueCount += 1;
      }
    }
  }
  return summary;
}
