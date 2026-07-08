"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { followUpSchema, occurrenceSchema } from "@/validations";
import { logAction } from "@/lib/audit";
import { notifyOccurrence } from "@/services/notification.service";
import { humanizeEnum } from "@/lib/utils";
import type { ActionResult } from "@/types";

export async function createFollowUp(input: unknown): Promise<ActionResult> {
  const user = await requireRole(["ADMIN", "PEDAGOGA"]);
  const parsed = followUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  const { studentId, title, notes, plan, status } = parsed.data;

  await prisma.pedagogicalFollowUp.create({
    data: { studentId, authorId: user.id, title, notes, plan: plan?.trim() || null, status },
  });
  await logAction({ userId: user.id, action: "followup.create", entity: "PedagogicalFollowUp", metadata: { studentId } });
  revalidatePath("/dashboard/pedagoga/acompanhamentos");
  return { ok: true, message: "Acompanhamento registrado." };
}

export async function updateFollowUpStatus(id: string, status: string): Promise<ActionResult> {
  const user = await requireRole(["ADMIN", "PEDAGOGA"]);
  if (!["ABERTO", "EM_ANDAMENTO", "CONCLUIDO"].includes(status)) return { ok: false, error: "Status inválido." };
  await prisma.pedagogicalFollowUp.update({ where: { id }, data: { status: status as never } });
  await logAction({ userId: user.id, action: "followup.status", entity: "PedagogicalFollowUp", entityId: id });
  revalidatePath("/dashboard/pedagoga/acompanhamentos");
  return { ok: true, message: "Status atualizado." };
}

export async function deleteFollowUp(id: string): Promise<ActionResult> {
  const user = await requireRole(["ADMIN", "PEDAGOGA"]);
  await prisma.pedagogicalFollowUp.delete({ where: { id } });
  await logAction({ userId: user.id, action: "followup.delete", entity: "PedagogicalFollowUp", entityId: id });
  revalidatePath("/dashboard/pedagoga/acompanhamentos");
  return { ok: true, message: "Acompanhamento removido." };
}

export async function registerOccurrence(input: unknown): Promise<ActionResult> {
  const user = await requireRole(["ADMIN", "PEDAGOGA", "DIRETOR", "PROFESSOR"]);
  const parsed = occurrenceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  const { studentId, type, severity, description } = parsed.data;

  await prisma.occurrence.create({
    data: { studentId, reportedById: user.id, type, severity, description },
  });

  // Notifica o responsável do aluno (se houver)
  try {
    await notifyOccurrence(studentId, `${humanizeEnum(type)} — ${description}`);
  } catch (err) {
    console.error("[notification] falha ao notificar ocorrência:", err);
  }

  await logAction({ userId: user.id, action: "occurrence.create", entity: "Occurrence", metadata: { studentId } });
  revalidatePath("/dashboard/pedagoga/acompanhamentos");
  return { ok: true, message: "Ocorrência registrada. Responsável notificado." };
}
