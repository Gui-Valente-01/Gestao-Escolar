"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { subjectSchema } from "@/validations";
import { logAction } from "@/lib/audit";
import type { ActionResult } from "@/types";

function clean(v?: string) {
  return v && v.trim() ? v.trim() : null;
}

export async function createSubject(input: unknown): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };

  const exists = await prisma.subject.findFirst({ where: { name: parsed.data.name } });
  if (exists) return { ok: false, error: "Já existe uma disciplina com este nome." };

  const subject = await prisma.subject.create({
    data: { name: parsed.data.name, code: clean(parsed.data.code), workload: parsed.data.workload || null },
  });
  await logAction({ userId: admin.id, action: "subject.create", entity: "Subject", entityId: subject.id });
  revalidatePath("/dashboard/admin/disciplinas");
  return { ok: true, message: "Disciplina criada." };
}

export async function updateSubject(id: string, input: unknown): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.subject.update({
    where: { id },
    data: { name: parsed.data.name, code: clean(parsed.data.code), workload: parsed.data.workload || null },
  });
  await logAction({ userId: admin.id, action: "subject.update", entity: "Subject", entityId: id });
  revalidatePath("/dashboard/admin/disciplinas");
  return { ok: true, message: "Disciplina atualizada." };
}

export async function deleteSubject(id: string): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  await prisma.subject.delete({ where: { id } });
  await logAction({ userId: admin.id, action: "subject.delete", entity: "Subject", entityId: id });
  revalidatePath("/dashboard/admin/disciplinas");
  return { ok: true, message: "Disciplina removida." };
}
