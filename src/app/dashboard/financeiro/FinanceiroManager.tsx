"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Plus, Trash2, XCircle } from "lucide-react";
import { invoiceSchema, type InvoiceInput } from "@/validations";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { FormInput } from "@/components/forms/FormInput";
import { SelectInput } from "@/components/forms/SelectInput";
import { useToast } from "@/components/providers/ToastProvider";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createInvoice, setInvoiceStatus, deleteInvoice } from "./actions";

interface InvoiceRow {
  id: string;
  student: string;
  className: string | null;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
  paidAt: string | null;
}
interface Summary {
  pending: number;
  paid: number;
  overdue: number;
  pendingCount: number;
  paidCount: number;
  overdueCount: number;
  total: number;
}

const STATUS_META: Record<string, { label: string; tone: "emerald" | "amber" | "red" | "slate" }> = {
  PAGO: { label: "Pago", tone: "emerald" },
  PENDENTE: { label: "Pendente", tone: "amber" },
  ATRASADO: { label: "Atrasado", tone: "red" },
  CANCELADO: { label: "Cancelado", tone: "slate" },
};

function effectiveStatus(inv: InvoiceRow) {
  if (inv.status === "PENDENTE" && new Date(inv.dueDate) < new Date()) return "ATRASADO";
  return inv.status;
}

export function FinanceiroManager({
  invoices,
  canManage,
  summary,
  students,
}: {
  invoices: InvoiceRow[];
  canManage: boolean;
  summary: Summary | null;
  students: { id: string; name: string; className: string | null }[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceInput>({ resolver: zodResolver(invoiceSchema), defaultValues: { status: "PENDENTE" } });

  async function onSubmit(values: InvoiceInput) {
    const res = await createInvoice(values);
    if (!res.ok) return showToast({ tone: "error", title: res.error });
    showToast({ tone: "success", title: res.message ?? "Criada." });
    reset({ status: "PENDENTE" });
    setOpen(false);
    router.refresh();
  }

  function act(fn: Promise<{ ok: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const res = await fn;
      showToast({ tone: res.ok ? "success" : "error", title: res.ok ? (res.message ?? "Feito.") : (res.error ?? "Erro.") });
      if (res.ok) router.refresh();
    });
  }

  const statusBadge = (inv: InvoiceRow) => {
    const meta = STATUS_META[effectiveStatus(inv)] ?? STATUS_META.PENDENTE;
    return <Badge tone={meta.tone}>{meta.label}</Badge>;
  };

  const columns: Column<InvoiceRow>[] = [
    ...(canManage
      ? [{ key: "student", header: "Aluno", render: (i: InvoiceRow) => (
          <div>
            <p className="font-medium text-slate-800 dark:text-white">{i.student}</p>
            <p className="text-xs text-slate-400">{i.className ?? "Sem turma"}</p>
          </div>
        ) } as Column<InvoiceRow>]
      : []),
    { key: "description", header: "Descrição" },
    { key: "amount", header: "Valor", render: (i) => <span className="font-semibold">{formatCurrency(i.amount)}</span> },
    { key: "dueDate", header: "Vencimento", render: (i) => formatDate(i.dueDate) },
    { key: "status", header: "Status", render: statusBadge },
    ...(canManage
      ? [{
          key: "actions",
          header: "Ações",
          className: "text-right",
          render: (i: InvoiceRow) => (
            <div className="flex justify-end gap-1">
              {i.status !== "PAGO" && (
                <button
                  onClick={() => act(setInvoiceStatus(i.id, "PAGO"))}
                  disabled={pending}
                  className="rounded-lg p-1.5 text-emerald-500 transition hover:bg-emerald-500/10 disabled:opacity-50"
                  title="Marcar como paga"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              )}
              {i.status !== "CANCELADO" && i.status !== "PAGO" && (
                <button
                  onClick={() => act(setInvoiceStatus(i.id, "CANCELADO"))}
                  disabled={pending}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-500/10 disabled:opacity-50"
                  title="Cancelar"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => act(deleteInvoice(i.id))}
                disabled={pending}
                className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
                title="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ),
        } as Column<InvoiceRow>]
      : []),
  ];

  return (
    <div className="space-y-6">
      {canManage && summary && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard label="A receber" value={formatCurrency(summary.pending)} hint={`${summary.pendingCount} em aberto`} icon="Clock" tone="amber" />
          <DashboardCard label="Recebido" value={formatCurrency(summary.paid)} hint={`${summary.paidCount} pagas`} icon="CircleDollarSign" tone="emerald" />
          <DashboardCard label="Em atraso" value={formatCurrency(summary.overdue)} hint={`${summary.overdueCount} vencidas`} icon="AlertTriangle" tone="red" />
          <DashboardCard label="Total de faturas" value={summary.total} icon="Receipt" tone="brand" />
        </div>
      )}

      <DataTable
        data={invoices}
        columns={columns}
        getSearchText={(i) => `${i.student} ${i.description} ${i.status}`}
        emptyMessage="Nenhuma mensalidade encontrada."
        toolbar={
          canManage ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Nova mensalidade
            </Button>
          ) : undefined
        }
      />

      {canManage && (
        <Modal open={open} onClose={() => setOpen(false)} title="Nova mensalidade">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <SelectInput
              label="Aluno"
              placeholder="Selecione"
              error={errors.studentId?.message}
              options={students.map((s) => ({ value: s.id, label: `${s.name}${s.className ? ` — ${s.className}` : ""}` }))}
              {...register("studentId")}
            />
            <FormInput label="Descrição" placeholder="Mensalidade Julho/2026" error={errors.description?.message} {...register("description")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput label="Valor (R$)" type="number" step="0.01" placeholder="450.00" error={errors.amount?.message} {...register("amount")} />
              <FormInput label="Vencimento" type="date" error={errors.dueDate?.message} {...register("dueDate")} />
            </div>
            <SelectInput
              label="Situação"
              error={errors.status?.message}
              options={[
                { value: "PENDENTE", label: "Pendente" },
                { value: "PAGO", label: "Pago" },
                { value: "ATRASADO", label: "Atrasado" },
                { value: "CANCELADO", label: "Cancelado" },
              ]}
              {...register("status")}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Salvar mensalidade
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
