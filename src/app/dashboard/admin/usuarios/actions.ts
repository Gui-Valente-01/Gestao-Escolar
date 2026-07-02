"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireRole } from "@/lib/auth";
import { userSchema } from "@/validations";
import { logAction } from "@/lib/audit";
import type { ActionResult } from "@/types";

export async function createUser(input: unknown): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { name, email, role, password, active } = parsed.data;
  if (!password) return { ok: false, error: "Senha é obrigatória na criação." };

  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) return { ok: false, error: "Já existe um usuário com este e-mail." };

  const user = await prisma.user.create({
    data: { name, email: email.toLowerCase().trim(), role, active, passwordHash: await hashPassword(password) },
  });
  await logAction({ userId: admin.id, action: "user.create", entity: "User", entityId: user.id });
  revalidatePath("/dashboard/admin/usuarios");
  return { ok: true, message: "Usuário criado com sucesso." };
}

export async function updateUser(id: string, input: unknown): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { name, email, role, password, active } = parsed.data;

  const conflict = await prisma.user.findFirst({ where: { email: email.toLowerCase(), NOT: { id } } });
  if (conflict) return { ok: false, error: "E-mail já utilizado por outro usuário." };

  await prisma.user.update({
    data: {
      name,
      email: email.toLowerCase().trim(),
      role,
      active,
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
    where: { id },
  });
  await logAction({ userId: admin.id, action: "user.update", entity: "User", entityId: id });
  revalidatePath("/dashboard/admin/usuarios");
  return { ok: true, message: "Usuário atualizado." };
}

export async function deleteUser(id: string): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  if (admin.id === id) return { ok: false, error: "Você não pode excluir a própria conta." };
  await prisma.user.delete({ where: { id } });
  await logAction({ userId: admin.id, action: "user.delete", entity: "User", entityId: id });
  revalidatePath("/dashboard/admin/usuarios");
  return { ok: true, message: "Usuário removido." };
}
