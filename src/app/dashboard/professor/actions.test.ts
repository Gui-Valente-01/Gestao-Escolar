import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  student: {
    findUnique: vi.fn(),
  },
  grade: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  attendance: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  activity: {
    create: vi.fn(),
  },
  announcement: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));
const authMock = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
}));
const teacherServiceMock = vi.hoisted(() => ({
  teacherCanManage: vi.fn(),
}));
const notificationMock = vi.hoisted(() => ({
  notifyGradeRisk: vi.fn(),
  notifyAttendanceRiskForStudents: vi.fn(),
}));
const auditMock = vi.hoisted(() => ({ logAction: vi.fn() }));
const cacheMock = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => authMock);
vi.mock("@/services/teacher.service", () => teacherServiceMock);
vi.mock("@/services/notification.service", () => notificationMock);
vi.mock("@/lib/audit", () => auditMock);
vi.mock("next/cache", () => cacheMock);

import { launchGrade, saveAttendance } from "./actions";

describe("professor actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.getCurrentProfile.mockResolvedValue({
      id: "user-1",
      role: "PROFESSOR",
      teacherId: "teacher-1",
      studentId: null,
      guardianId: null,
    });
  });

  it("impede lancamento de nota sem perfil de professor", async () => {
    authMock.getCurrentProfile.mockResolvedValue({ id: "user-1", role: "ALUNO", teacherId: null });

    const result = await launchGrade({
      studentId: "student-1",
      subjectId: "subject-1",
      term: "PRIMEIRO",
      year: 2026,
      value: 8,
      assessment: "Prova",
    });

    expect(result.ok).toBe(false);
    expect(prismaMock.grade.create).not.toHaveBeenCalled();
  });

  it("lanca nota, revalida a rota e tenta notificar responsavel", async () => {
    prismaMock.student.findUnique.mockResolvedValue({ classId: "class-1" });
    teacherServiceMock.teacherCanManage.mockResolvedValue(true);
    prismaMock.grade.create.mockResolvedValue({ id: "grade-1" });

    const result = await launchGrade({
      studentId: "student-1",
      subjectId: "subject-1",
      term: "PRIMEIRO",
      year: 2026,
      value: 5.5,
      assessment: "Prova",
    });

    expect(result.ok).toBe(true);
    expect(prismaMock.grade.create).toHaveBeenCalledWith({
      data: {
        studentId: "student-1",
        subjectId: "subject-1",
        teacherId: "teacher-1",
        term: "PRIMEIRO",
        year: 2026,
        value: 5.5,
        assessment: "Prova",
      },
    });
    expect(notificationMock.notifyGradeRisk).toHaveBeenCalledWith("student-1", 2026);
    expect(cacheMock.revalidatePath).toHaveBeenCalledWith("/dashboard/professor/notas");
  });

  it("salva frequencia em lote e notifica apenas ausentes", async () => {
    teacherServiceMock.teacherCanManage.mockResolvedValue(true);
    prismaMock.attendance.deleteMany.mockReturnValue("deleteMany");
    prismaMock.attendance.createMany.mockReturnValue("createMany");
    prismaMock.$transaction.mockResolvedValue([]);

    const result = await saveAttendance({
      classId: "class-1",
      subjectId: "subject-1",
      date: "2026-06-30",
      items: [
        { studentId: "student-1", present: true, justified: false },
        { studentId: "student-2", present: false, justified: false },
      ],
    });

    expect(result.ok).toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalledWith(["deleteMany", "createMany"]);
    expect(notificationMock.notifyAttendanceRiskForStudents).toHaveBeenCalledWith(["student-2"], 2026);
    expect(cacheMock.revalidatePath).toHaveBeenCalledWith("/dashboard/professor/frequencia");
  });
});
