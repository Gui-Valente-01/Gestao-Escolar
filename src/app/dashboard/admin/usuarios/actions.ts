"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireRole } from "@/lib/auth";
import { userSchema } from "@/validations";
import { logAction } from "@/lib/audit";
import { currentYear } from "@/lib/utils";
import type { ActionResult } from "@/types";

type Tx = Prisma.TransactionClient;

function clean(value?: string | null) {
  return value?.trim() || null;
}

function autoRegistration() {
  return `AUTO-${currentYear()}-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

async function validateStudentClass(role: Role, classId?: string | null): Promise<ActionResult | null> {
  if (role !== "ALUNO") return null;
  if (!classId) return { ok: false, error: "Selecione a turma do aluno.", fieldErrors: { classId: ["Selecione a turma"] } };

  const exists = await prisma.class.findUnique({ where: { id: classId }, select: { id: true } });
  if (!exists) return { ok: false, error: "Turma selecionada nao encontrada.", fieldErrors: { classId: ["Turma nao encontrada"] } };
  return null;
}

async function ensureProfileForRole(tx: Tx, userId: string, role: Role, classId?: string | null) {
  if (role === "PROFESSOR") {
    await tx.teacher.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return;
  }

  if (role === "RESPONSAVEL") {
    await tx.guardian.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return;
  }

  if (role === "ALUNO" && classId) {
    const student = await tx.student.upsert({
      where: { userId },
      update: { classId },
      create: {
        userId,
        classId,
        registration: autoRegistration(),
      },
      select: { id: true },
    });

    await tx.enrollment.upsert({
      where: { studentId_classId_year: { studentId: student.id, classId, year: currentYear() } },
      update: { status: "ATIVA" },
      create: { studentId: student.id, classId, year: currentYear(), status: "ATIVA" },
    });
  }
}

export async function createUser(input: unknown): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados invalidos", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, role, password, active, classId } = parsed.data;
  if (!password) return { ok: false, error: "Senha e obrigatoria na criacao." };

  const selectedClassId = clean(classId);
  const classError = await validateStudentClass(role, selectedClassId);
  if (classError) return classError;

  const normalizedEmail = email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (exists) return { ok: false, error: "Ja existe um usuario com este e-mail." };

  const passwordHash = await hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name: name.trim(), email: normalizedEmail, role, active, passwordHash },
    });
    await ensureProfileForRole(tx, created.id, role, selectedClassId);
    return created;
  });

  await logAction({ userId: admin.id, action: "user.create", entity: "User", entityId: user.id });
  revalidatePath("/dashboard/admin/usuarios");
  return { ok: true, message: "Usuario criado com sucesso." };
}

export async function updateUser(id: string, input: unknown): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados invalidos", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, role, password, active, classId } = parsed.data;
  const selectedClassId = clean(classId);
  const classError = await validateStudentClass(role, selectedClassId);
  if (classError) return classError;

  const normalizedEmail = email.toLowerCase().trim();
  const conflict = await prisma.user.findFirst({ where: { email: normalizedEmail, NOT: { id } } });
  if (conflict) return { ok: false, error: "E-mail ja utilizado por outro usuario." };

  const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return { ok: false, error: "Usuario nao encontrado." };

  const passwordHash = password ? await hashPassword(password) : null;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        role,
        active,
        ...(passwordHash ? { passwordHash } : {}),
      },
      where: { id },
    });
    await ensureProfileForRole(tx, id, role, selectedClassId);
  });

  await logAction({ userId: admin.id, action: "user.update", entity: "User", entityId: id });
  revalidatePath("/dashboard/admin/usuarios");
  return { ok: true, message: "Usuario atualizado." };
}

export async function deleteUser(id: string): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  if (admin.id === id) return { ok: false, error: "Voce nao pode excluir a propria conta." };
  await prisma.user.delete({ where: { id } });
  await logAction({ userId: admin.id, action: "user.delete", entity: "User", entityId: id });
  revalidatePath("/dashboard/admin/usuarios");
  return { ok: true, message: "Usuario removido." };
}
