"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { classSchema, assignmentSchema } from "@/validations";
import { logAction } from "@/lib/audit";
import type { ActionResult } from "@/types";

export async function createClass(input: unknown): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = classSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };

  const exists = await prisma.class.findFirst({ where: { name: parsed.data.name, year: parsed.data.year } });
  if (exists) return { ok: false, error: "Já existe uma turma com este nome neste ano." };

  const cls = await prisma.class.create({ data: parsed.data });
  await logAction({ userId: admin.id, action: "class.create", entity: "Class", entityId: cls.id });
  revalidatePath("/dashboard/admin/turmas");
  return { ok: true, message: "Turma criada." };
}

export async function updateClass(id: string, input: unknown): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = classSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.class.update({ where: { id }, data: parsed.data });
  await logAction({ userId: admin.id, action: "class.update", entity: "Class", entityId: id });
  revalidatePath("/dashboard/admin/turmas");
  return { ok: true, message: "Turma atualizada." };
}

export async function deleteClass(id: string): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  await prisma.class.delete({ where: { id } });
  await logAction({ userId: admin.id, action: "class.delete", entity: "Class", entityId: id });
  revalidatePath("/dashboard/admin/turmas");
  return { ok: true, message: "Turma removida." };
}

// --------------------------------------------------------------------------
// Vínculos professor <-> disciplina <-> turma
// --------------------------------------------------------------------------

export async function createAssignment(input: unknown): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Selecione professor, disciplina e turma." };

  const exists = await prisma.teachingAssignment.findFirst({ where: parsed.data });
  if (exists) return { ok: false, error: "Este vínculo já existe." };

  await prisma.teachingAssignment.create({ data: parsed.data });
  await logAction({ userId: admin.id, action: "assignment.create", entity: "TeachingAssignment" });
  revalidatePath("/dashboard/admin/turmas");
  return { ok: true, message: "Vínculo criado." };
}

export async function deleteAssignment(id: string): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  await prisma.teachingAssignment.delete({ where: { id } });
  await logAction({ userId: admin.id, action: "assignment.delete", entity: "TeachingAssignment", entityId: id });
  revalidatePath("/dashboard/admin/turmas");
  return { ok: true, message: "Vínculo removido." };
}
