"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireRole } from "@/lib/auth";
import { guardianSchema } from "@/validations";
import { logAction } from "@/lib/audit";
import type { ActionResult } from "@/types";

function clean(v?: string) {
  return v && v.trim() ? v.trim() : null;
}

export async function createGuardian(input: unknown): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = guardianSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  const { name, email, password, phone, cpf } = parsed.data;
  if (!password) return { ok: false, error: "Senha é obrigatória na criação." };

  if (await prisma.user.findUnique({ where: { email: email.toLowerCase() } }))
    return { ok: false, error: "Já existe um usuário com este e-mail." };

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      role: "RESPONSAVEL",
      passwordHash: await hashPassword(password),
      guardian: { create: { phone: clean(phone), cpf: clean(cpf) } },
    },
  });
  await logAction({ userId: admin.id, action: "guardian.create", entity: "User", entityId: user.id });
  revalidatePath("/dashboard/admin/responsaveis");
  return { ok: true, message: "Responsável cadastrado." };
}

export async function updateGuardian(guardianId: string, input: unknown): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = guardianSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  const { name, email, password, phone, cpf } = parsed.data;

  const guardian = await prisma.guardian.findUnique({ where: { id: guardianId } });
  if (!guardian) return { ok: false, error: "Responsável não encontrado." };

  const conflict = await prisma.user.findFirst({ where: { email: email.toLowerCase(), NOT: { id: guardian.userId } } });
  if (conflict) return { ok: false, error: "E-mail já utilizado por outro usuário." };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: guardian.userId },
      data: { name, email: email.toLowerCase().trim(), ...(password ? { passwordHash: await hashPassword(password) } : {}) },
    }),
    prisma.guardian.update({ where: { id: guardianId }, data: { phone: clean(phone), cpf: clean(cpf) } }),
  ]);
  await logAction({ userId: admin.id, action: "guardian.update", entity: "Guardian", entityId: guardianId });
  revalidatePath("/dashboard/admin/responsaveis");
  return { ok: true, message: "Responsável atualizado." };
}

export async function deleteGuardian(guardianId: string): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const guardian = await prisma.guardian.findUnique({ where: { id: guardianId } });
  if (!guardian) return { ok: false, error: "Responsável não encontrado." };
  await prisma.user.delete({ where: { id: guardian.userId } });
  await logAction({ userId: admin.id, action: "guardian.delete", entity: "Guardian", entityId: guardianId });
  revalidatePath("/dashboard/admin/responsaveis");
  return { ok: true, message: "Responsável removido." };
}
