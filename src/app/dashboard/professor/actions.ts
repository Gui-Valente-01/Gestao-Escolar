"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { gradeSchema, attendanceBatchSchema, activitySchema, announcementSchema } from "@/validations";
import { teacherCanManage } from "@/services/teacher.service";
import { notifyAttendanceRiskForStudents, notifyGradeRisk } from "@/services/notification.service";
import { logAction } from "@/lib/audit";
import type { ActionResult } from "@/types";

async function getTeacherId(): Promise<{ id: string; userId: string } | null> {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "PROFESSOR" && profile.role !== "ADMIN")) return null;
  if (!profile.teacherId) return null;
  return { id: profile.teacherId, userId: profile.id };
}

// ----------------------------------------------------------------------------
// Notas
// ----------------------------------------------------------------------------

export async function launchGrade(input: unknown): Promise<ActionResult> {
  const teacher = await getTeacherId();
  if (!teacher) return { ok: false, error: "Apenas professores podem lançar notas." };

  const parsed = gradeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  const { studentId, subjectId, term, year, value, assessment } = parsed.data;

  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { classId: true } });
  if (!student?.classId) return { ok: false, error: "Aluno sem turma definida." };

  const allowed = await teacherCanManage(teacher.id, student.classId, subjectId);
  if (allowed === false) return { ok: false, error: "Você não leciona esta disciplina nesta turma." };

  await prisma.grade.create({
    data: { studentId, subjectId, teacherId: teacher.id, term, year, value, assessment: assessment?.trim() || null },
  });
  try {
    await notifyGradeRisk(studentId, year);
  } catch (err) {
    console.error("[notification] falha ao gerar alerta de nota:", err);
  }
  await logAction({ userId: teacher.userId, action: "grade.create", entity: "Grade", metadata: { studentId, subjectId, value } });
  revalidatePath("/dashboard/professor/notas");
  return { ok: true, message: "Nota lançada com sucesso." };
}

export async function deleteGrade(id: string): Promise<ActionResult> {
  const teacher = await getTeacherId();
  if (!teacher) return { ok: false, error: "Sem permissão." };
  const grade = await prisma.grade.findUnique({ where: { id } });
  if (!grade || grade.teacherId !== teacher.id) return { ok: false, error: "Nota não encontrada." };
  await prisma.grade.delete({ where: { id } });
  revalidatePath("/dashboard/professor/notas");
  return { ok: true, message: "Nota removida." };
}

// ----------------------------------------------------------------------------
// Frequência (lote)
// ----------------------------------------------------------------------------

export async function saveAttendance(input: unknown): Promise<ActionResult> {
  const teacher = await getTeacherId();
  if (!teacher) return { ok: false, error: "Apenas professores podem registrar frequência." };

  const parsed = attendanceBatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const { classId, subjectId, date, items } = parsed.data;

  const allowed = await teacherCanManage(teacher.id, classId, subjectId || undefined);
  if (allowed === false) return { ok: false, error: "Você não leciona nesta turma." };

  const day = new Date(date);
  if (Number.isNaN(day.getTime())) return { ok: false, error: "Data inválida." };
  const studentIds = items.map((i) => i.studentId);

  // Substitui registros existentes da mesma data/disciplina
  await prisma.$transaction([
    prisma.attendance.deleteMany({
      where: { studentId: { in: studentIds }, date: day, subjectId: subjectId || null },
    }),
    prisma.attendance.createMany({
      data: items.map((i) => ({
        studentId: i.studentId,
        subjectId: subjectId || null,
        teacherId: teacher.id,
        date: day,
        present: i.present,
        justified: i.justified ?? false,
        note: i.present ? null : "Falta registrada",
      })),
    }),
  ]);

  try {
    await notifyAttendanceRiskForStudents(items.filter((i) => !i.present).map((i) => i.studentId), day.getFullYear());
  } catch (err) {
    console.error("[notification] falha ao gerar alerta de frequencia:", err);
  }

  await logAction({ userId: teacher.userId, action: "attendance.save", entity: "Attendance", metadata: { classId, count: items.length } });
  revalidatePath("/dashboard/professor/frequencia");
  return { ok: true, message: `Frequência de ${items.length} aluno(s) registrada.` };
}

// ----------------------------------------------------------------------------
// Atividades
// ----------------------------------------------------------------------------

export async function createActivity(input: unknown): Promise<ActionResult> {
  const teacher = await getTeacherId();
  if (!teacher) return { ok: false, error: "Apenas professores podem criar atividades." };

  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  const { title, description, type, dueDate, classId, subjectId, adapted, adaptationNotes, attachments } = parsed.data;

  const allowed = await teacherCanManage(teacher.id, classId, subjectId || undefined);
  if (allowed === false) return { ok: false, error: "Você não leciona nesta turma." };

  await prisma.activity.create({
    data: {
      title,
      description: description?.trim() || null,
      type,
      dueDate: dueDate ? new Date(dueDate) : null,
      classId,
      subjectId: subjectId || null,
      teacherId: teacher.id,
      adapted: adapted ?? false,
      adaptationNotes: adaptationNotes?.trim() || null,
      attachments:
        attachments && attachments.length
          ? { create: attachments.map((a) => ({ type: a.type, title: a.title?.trim() || null, url: a.url })) }
          : undefined,
    },
  });
  await logAction({ userId: teacher.userId, action: "activity.create", entity: "Activity" });
  revalidatePath("/dashboard/professor/atividades");
  return { ok: true, message: "Atividade criada." };
}

// ----------------------------------------------------------------------------
// Comunicados
// ----------------------------------------------------------------------------

export async function createAnnouncement(input: unknown): Promise<ActionResult> {
  const teacher = await getTeacherId();
  if (!teacher) return { ok: false, error: "Sem permissão." };

  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      audience: parsed.data.audience,
      classId: parsed.data.classId || null,
      authorId: teacher.userId,
    },
  });
  await logAction({ userId: teacher.userId, action: "announcement.create", entity: "Announcement" });
  revalidatePath("/dashboard/professor/atividades");
  return { ok: true, message: "Comunicado publicado." };
}
