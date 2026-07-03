import { requireRole, getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { listInvoices, getFinanceSummary } from "@/services/finance.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { FinanceiroManager } from "./FinanceiroManager";

export default async function FinanceiroPage() {
  await requireRole(["ADMIN", "DIRETOR", "RESPONSAVEL"]);
  const profile = await getCurrentProfile();
  if (!profile) return <div className="card p-8 text-center text-slate-500">Sessão expirada.</div>;

  const canManage = PERMISSIONS.manageFinance(profile.role);
  const invoices = await listInvoices(profile);
  const summary = canManage ? await getFinanceSummary() : null;
  const students = canManage
    ? await prisma.student.findMany({
        include: { user: { select: { name: true } }, class: { select: { name: true } } },
        orderBy: { user: { name: "asc" } },
      })
    : [];

  const rows = invoices.map((i) => ({
    id: i.id,
    student: i.student.user.name,
    className: i.student.class?.name ?? null,
    description: i.description,
    amount: i.amount,
    dueDate: i.dueDate.toISOString(),
    status: i.status,
    paidAt: i.paidAt ? i.paidAt.toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={canManage ? "Financeiro" : "Mensalidades"}
        subtitle={canManage ? "Controle de mensalidades e pagamentos da escola." : "Acompanhe as mensalidades dos seus filhos."}
      />
      <FinanceiroManager
        invoices={rows}
        canManage={canManage}
        summary={summary}
        students={students.map((s) => ({ id: s.id, name: s.user.name, className: s.class?.name ?? null }))}
      />
    </div>
  );
}
