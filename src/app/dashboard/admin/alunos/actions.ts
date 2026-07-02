"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireRole } from "@/lib/auth";
import { studentSchema } from "@/validations";
import { logAction } from "@/lib/audit";
import { currentYear } from "@/lib/utils";
import type { ActionResult } from "@/types";

function clean(v?: string) {
  return v && v.trim() ? v.trim() : null;
}
function toDate(v?: string) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createStudent(input: unknown): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  const { name, email, password, registration, birthDate, classId, guardianId } = parsed.data;
  if (!password) return { ok: false, error: "Senha é obrigatória na criação." };

  if (await prisma.user.findUnique({ where: { email: email.toLowerCase() } }))
    return { ok: false, error: "Já existe um usuário com este e-mail." };
  if (await prisma.student.findUnique({ where: { registration } }))
    return { ok: false, error: "Já existe um aluno com esta matrícula." };

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      role: "ALUNO",
      passwordHash: await hashPassword(password),
      student: {
        create: {
          registration,
          birthDate: toDate(birthDate),
          classId: clean(classId),
          guardianId: clean(guardianId),
        },
      },
    },
    include: { student: true },
  });

  // Matrícula no ano letivo, se houver turma
  if (user.student?.classId) {
    await prisma.enrollment.create({
      data: { studentId: user.student.id, classId: user.student.classId, year: currentYear(), status: "ATIVA" },
    });
  }

  await logAction({ userId: admin.id, action: "student.create", entity: "User", entityId: user.id });
  revalidatePath("/dashboard/admin/alunos");
  return { ok: true, message: "Aluno cadastrado." };
}

export async function updateStudent(studentId: string, input: unknown): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  const { name, email, password, registration, birthDate, classId, guardianId } = parsed.data;

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return { ok: false, error: "Aluno não encontrado." };

  const emailConflict = await prisma.user.findFirst({ where: { email: email.toLowerCase(), NOT: { id: student.userId } } });
  if (emailConflict) return { ok: false, error: "E-mail já utilizado por outro usuário." };
  const regConflict = await prisma.student.findFirst({ where: { registration, NOT: { id: studentId } } });
  if (regConflict) return { ok: false, error: "Matrícula já utilizada por outro aluno." };

  const newClassId = clean(classId);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: student.userId },
      data: { name, email: email.toLowerCase().trim(), ...(password ? { passwordHash: await hashPassword(password) } : {}) },
    }),
    prisma.student.update({
      where: { id: studentId },
      data: { registration, birthDate: toDate(birthDate), classId: newClassId, guardianId: clean(guardianId) },
    }),
  ]);

  // Garante matrícula no ano letivo para a turma atual
  if (newClassId) {
    await prisma.enrollment.upsert({
      where: { studentId_classId_year: { studentId, classId: newClassId, year: currentYear() } },
      update: { status: "ATIVA" },
      create: { studentId, classId: newClassId, year: currentYear(), status: "ATIVA" },
    });
  }

  await logAction({ userId: admin.id, action: "student.update", entity: "Student", entityId: studentId });
  revalidatePath("/dashboard/admin/alunos");
  return { ok: true, message: "Aluno atualizado." };
}

export async function deleteStudent(studentId: string): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return { ok: false, error: "Aluno não encontrado." };
  await prisma.user.delete({ where: { id: student.userId } });
  await logAction({ userId: admin.id, action: "student.delete", entity: "Student", entityId: studentId });
  revalidatePath("/dashboard/admin/alunos");
  return { ok: true, message: "Aluno removido." };
}
