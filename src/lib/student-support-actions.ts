"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supportNeedSchema, developmentNoteSchema } from "@/validations";
import { logAction } from "@/lib/audit";
import type { ActionResult } from "@/types";

function revalidateRecords() {
  revalidatePath("/dashboard/pedagoga/alunos");
  revalidatePath("/dashboard/professor/alunos");
}

// ----------------------------------------------------------------------------
// Laudos / necessidades especiais (gestão pedagógica)
// ----------------------------------------------------------------------------

export async function createSupportNeed(input: unknown): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sessão expirada." };
  if (!["ADMIN", "DIRETOR", "PEDAGOGA"].includes(profile.role)) {
    return { ok: false, error: "Apenas a equipe pedagógica pode registrar laudos." };
  }

  const parsed = supportNeedSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;

  const need = await prisma.studentSupportNeed.create({
    data: {
      studentId: d.studentId,
      type: d.type,
      description: d.description,
      observations: d.observations?.trim() || null,
      documentUrl: d.documentUrl?.trim() || null,
      active: d.active,
      createdById: profile.id,
    },
  });

  await logAction({ userId: profile.id, action: "supportNeed.create", entity: "StudentSupportNeed", entityId: need.id, metadata: { studentId: d.studentId } });
  revalidateRecords();
  return { ok: true, message: "Laudo/necessidade registrado." };
}

export async function deleteSupportNeed(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || !["ADMIN", "DIRETOR", "PEDAGOGA"].includes(profile.role)) {
    return { ok: false, error: "Sem permissão." };
  }
  await prisma.studentSupportNeed.delete({ where: { id } });
  await logAction({ userId: profile.id, action: "supportNeed.delete", entity: "StudentSupportNeed", entityId: id });
  revalidateRecords();
  return { ok: true, message: "Registro removido." };
}

// ----------------------------------------------------------------------------
// Anotações de desenvolvimento (professor + pedagoga)
// ----------------------------------------------------------------------------

export async function createDevelopmentNote(input: unknown): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sessão expirada." };
  if (!["ADMIN", "DIRETOR", "PEDAGOGA", "PROFESSOR"].includes(profile.role)) {
    return { ok: false, error: "Sem permissão para registrar anotações." };
  }

  const parsed = developmentNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Professor só anota sobre alunos das suas turmas
  if (profile.role === "PROFESSOR") {
    const student = await prisma.student.findUnique({ where: { id: parsed.data.studentId }, select: { classId: true } });
    if (!student?.classId) return { ok: false, error: "Aluno sem turma definida." };
    const teaches = await prisma.teachingAssignment.findFirst({
      where: { teacherId: profile.teacherId ?? "", classId: student.classId },
      select: { id: true },
    });
    if (!teaches) return { ok: false, error: "Este aluno não está em uma das suas turmas." };
  }

  const note = await prisma.studentDevelopmentNote.create({
    data: { studentId: parsed.data.studentId, authorId: profile.id, content: parsed.data.content.trim() },
  });

  await logAction({ userId: profile.id, action: "devNote.create", entity: "StudentDevelopmentNote", entityId: note.id, metadata: { studentId: parsed.data.studentId } });
  revalidateRecords();
  return { ok: true, message: "Anotação registrada." };
}

export async function deleteDevelopmentNote(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sessão expirada." };

  const note = await prisma.studentDevelopmentNote.findUnique({ where: { id }, select: { authorId: true } });
  if (!note) return { ok: false, error: "Anotação não encontrada." };

  const isGestao = ["ADMIN", "DIRETOR", "PEDAGOGA"].includes(profile.role);
  if (!isGestao && note.authorId !== profile.id) {
    return { ok: false, error: "Você só pode remover suas próprias anotações." };
  }

  await prisma.studentDevelopmentNote.delete({ where: { id } });
  await logAction({ userId: profile.id, action: "devNote.delete", entity: "StudentDevelopmentNote", entityId: id });
  revalidateRecords();
  return { ok: true, message: "Anotação removida." };
}
