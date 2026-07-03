"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invoiceSchema } from "@/validations";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import type { ActionResult } from "@/types";
import type { InvoiceStatus } from "@prisma/client";

const VALID_STATUS = ["PENDENTE", "PAGO", "ATRASADO", "CANCELADO"];

export async function createInvoice(input: unknown): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sessão expirada." };
  if (!PERMISSIONS.manageFinance(profile.role)) return { ok: false, error: "Sem permissão." };

  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  const dueDate = new Date(d.dueDate);
  if (Number.isNaN(dueDate.getTime())) return { ok: false, error: "Data de vencimento inválida." };

  const invoice = await prisma.invoice.create({
    data: {
      studentId: d.studentId,
      description: d.description,
      amount: d.amount,
      dueDate,
      status: d.status,
      paidAt: d.status === "PAGO" ? new Date() : null,
      createdById: profile.id,
    },
  });

  await logAction({ userId: profile.id, action: "invoice.create", entity: "Invoice", entityId: invoice.id });
  revalidatePath("/dashboard/financeiro");
  return { ok: true, message: "Mensalidade criada." };
}

export async function setInvoiceStatus(id: string, status: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || !PERMISSIONS.manageFinance(profile.role)) return { ok: false, error: "Sem permissão." };
  if (!VALID_STATUS.includes(status)) return { ok: false, error: "Status inválido." };

  await prisma.invoice.update({
    where: { id },
    data: { status: status as InvoiceStatus, paidAt: status === "PAGO" ? new Date() : null },
  });

  await logAction({ userId: profile.id, action: "invoice.status", entity: "Invoice", entityId: id, metadata: { status } });
  revalidatePath("/dashboard/financeiro");
  return { ok: true, message: status === "PAGO" ? "Mensalidade marcada como paga." : "Status atualizado." };
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || !PERMISSIONS.manageFinance(profile.role)) return { ok: false, error: "Sem permissão." };

  await prisma.invoice.delete({ where: { id } });
  await logAction({ userId: profile.id, action: "invoice.delete", entity: "Invoice", entityId: id });
  revalidatePath("/dashboard/financeiro");
  return { ok: true, message: "Mensalidade removida." };
}
