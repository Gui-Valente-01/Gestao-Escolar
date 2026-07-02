import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  attendance: {
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  student: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { getStudentAbsences, getStudentAttendanceSummary, getStudentsWithManyAbsences } from "./attendance.service";

describe("attendance.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("monta resumo de frequencia com taxa de presenca", async () => {
    prismaMock.attendance.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);

    await expect(getStudentAttendanceSummary("student-1")).resolves.toEqual({
      total: 10,
      present: 7,
      absences: 3,
      justified: 1,
      rate: 70,
    });
  });

  it("retorna 100% de presenca sem registros", async () => {
    prismaMock.attendance.count.mockResolvedValue(0);

    await expect(getStudentAttendanceSummary("student-1")).resolves.toMatchObject({ total: 0, rate: 100 });
  });

  it("conta faltas de um aluno", async () => {
    prismaMock.attendance.count.mockResolvedValue(5);

    await expect(getStudentAbsences("student-1")).resolves.toBe(5);
    expect(prismaMock.attendance.count).toHaveBeenCalledWith({ where: { studentId: "student-1", present: false } });
  });

  it("mapeia alunos com muitas faltas", async () => {
    prismaMock.attendance.groupBy.mockResolvedValue([{ studentId: "student-1", _count: { _all: 6 } }]);
    prismaMock.student.findMany.mockResolvedValue([
      { id: "student-1", user: { name: "Ana" }, class: { name: "9A" } },
    ]);

    await expect(getStudentsWithManyAbsences(4)).resolves.toEqual([
      { studentId: "student-1", name: "Ana", className: "9A", absences: 6 },
    ]);
  });
});
