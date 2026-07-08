import { prisma } from "@/lib/prisma";
import { currentYear } from "@/lib/utils";
import { getStudentAverage } from "./grade.service";
import { getStudentAbsences } from "./attendance.service";

const GRADE_LIMIT = 6;
const ABSENCE_LIMIT = 4;

export async function notifyGradeRisk(studentId: string, year = currentYear()) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { name: true } },
      class: { select: { name: true } },
    },
  });
  if (!student?.guardianId) return null;

  const average = await getStudentAverage(studentId, year);
  if (average === null || average >= GRADE_LIMIT) return null;

  const title = `Nota abaixo de ${GRADE_LIMIT} - ${year}`;
  return prisma.notification.upsert({
    where: {
      guardianId_studentId_type_title: {
        guardianId: student.guardianId,
        studentId,
        type: "GRADE_RISK",
        title,
      },
    },
    update: {
      message: `${student.user.name} está com média ${average.toFixed(1)} em ${student.class?.name ?? "turma não informada"}.`,
      readAt: null,
    },
    create: {
      guardianId: student.guardianId,
      studentId,
      type: "GRADE_RISK",
      title,
      message: `${student.user.name} está com média ${average.toFixed(1)} em ${student.class?.name ?? "turma não informada"}.`,
    },
  });
}

export async function notifyAttendanceRisk(studentId: string, year = currentYear(), limit = ABSENCE_LIMIT) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { name: true } },
      class: { select: { name: true } },
    },
  });
  if (!student?.guardianId) return null;

  const absences = await getStudentAbsences(studentId);
  if (absences < limit) return null;

  const title = `Faltas no limite - ${year}`;
  return prisma.notification.upsert({
    where: {
      guardianId_studentId_type_title: {
        guardianId: student.guardianId,
        studentId,
        type: "ATTENDANCE_RISK",
        title,
      },
    },
    update: {
      message: `${student.user.name} chegou a ${absences} falta(s) em ${student.class?.name ?? "turma não informada"}.`,
      readAt: null,
    },
    create: {
      guardianId: student.guardianId,
      studentId,
      type: "ATTENDANCE_RISK",
      title,
      message: `${student.user.name} chegou a ${absences} falta(s) em ${student.class?.name ?? "turma não informada"}.`,
    },
  });
}

export async function notifyAttendanceRiskForStudents(studentIds: string[], year = currentYear()) {
  await Promise.all(studentIds.map((studentId) => notifyAttendanceRisk(studentId, year)));
}

/** Cria uma notificação para o responsável quando uma ocorrência é registrada. */
export async function notifyOccurrence(studentId: string, summary: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: { select: { name: true } } },
  });
  if (!student?.guardianId) return null;

  return prisma.notification.create({
    data: {
      guardianId: student.guardianId,
      studentId,
      type: "OCCURRENCE",
      // título com timestamp garante unicidade (cada ocorrência gera um aviso novo)
      title: `Nova ocorrência — ${new Date().toLocaleString("pt-BR")}`,
      message: `Foi registrada uma ocorrência para ${student.user.name}: ${summary}`,
    },
  });
}
