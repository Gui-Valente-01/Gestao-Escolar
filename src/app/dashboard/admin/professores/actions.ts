"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireRole } from "@/lib/auth";
import { teacherSchema } from "@/validations";
import { logAction } from "@/lib/audit";
import type { ActionResult } from "@/types";

function clean(v?: string) {
  return v && v.trim() ? v.trim() : null;
}

export async function createTeacher(input: unknown): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = teacherSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  const { name, email, password, registration, phone } = parsed.data;
  if (!password) return { ok: false, error: "Senha é obrigatória na criação." };

  if (await prisma.user.findUnique({ where: { email: email.toLowerCase() } }))
    return { ok: false, error: "Já existe um usuário com este e-mail." };

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      role: "PROFESSOR",
      passwordHash: await hashPassword(password),
      teacher: { create: { registration: clean(registration), phone: clean(phone) } },
    },
  });
  await logAction({ userId: admin.id, action: "teacher.create", entity: "User", entityId: user.id });
  revalidatePath("/dashboard/admin/professores");
  return { ok: true, message: "Professor cadastrado." };
}

export async function updateTeacher(teacherId: string, input: unknown): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = teacherSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  const { name, email, password, registration, phone } = parsed.data;

  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) return { ok: false, error: "Professor não encontrado." };

  const conflict = await prisma.user.findFirst({ where: { email: email.toLowerCase(), NOT: { id: teacher.userId } } });
  if (conflict) return { ok: false, error: "E-mail já utilizado por outro usuário." };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: teacher.userId },
      data: { name, email: email.toLowerCase().trim(), ...(password ? { passwordHash: await hashPassword(password) } : {}) },
    }),
    prisma.teacher.update({ where: { id: teacherId }, data: { registration: clean(registration), phone: clean(phone) } }),
  ]);
  await logAction({ userId: admin.id, action: "teacher.update", entity: "Teacher", entityId: teacherId });
  revalidatePath("/dashboard/admin/professores");
  return { ok: true, message: "Professor atualizado." };
}

export async function deleteTeacher(teacherId: string): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) return { ok: false, error: "Professor não encontrado." };
  await prisma.user.delete({ where: { id: teacher.userId } });
  await logAction({ userId: admin.id, action: "teacher.delete", entity: "Teacher", entityId: teacherId });
  revalidatePath("/dashboard/admin/professores");
  return { ok: true, message: "Professor removido." };
}
