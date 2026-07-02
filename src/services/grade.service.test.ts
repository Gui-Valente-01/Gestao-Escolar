import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  grade: {
    findMany: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
  subject: {
    findMany: vi.fn(),
  },
  class: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { getClassAverage, getSchoolAverage, getStudentAverage, getStudentGradesBySubject } from "./grade.service";

describe("grade.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calcula a media geral de um aluno", async () => {
    prismaMock.grade.findMany.mockResolvedValue([{ value: 7 }, { value: 8.5 }, { value: 6.5 }]);

    await expect(getStudentAverage("student-1", 2026)).resolves.toBe(7.3);
    expect(prismaMock.grade.findMany).toHaveBeenCalledWith({
      where: { studentId: "student-1", year: 2026 },
      select: { value: true },
    });
  });

  it("retorna null quando a media agregada da escola nao tem notas", async () => {
    prismaMock.grade.aggregate.mockResolvedValue({ _avg: { value: null } });

    await expect(getSchoolAverage(2026)).resolves.toBeNull();
  });

  it("arredonda a media da turma com uma casa decimal", async () => {
    prismaMock.grade.aggregate.mockResolvedValue({ _avg: { value: 6.666 } });

    await expect(getClassAverage("class-1", 2026)).resolves.toBe(6.7);
  });

  it("agrupa medias por disciplina com nomes reais", async () => {
    prismaMock.grade.groupBy.mockResolvedValue([
      { subjectId: "math", _avg: { value: 5.95 } },
      { subjectId: "port", _avg: { value: 8 } },
    ]);
    prismaMock.subject.findMany.mockResolvedValue([
      { id: "math", name: "Matematica" },
      { id: "port", name: "Portugues" },
    ]);

    await expect(getStudentGradesBySubject("student-1", 2026)).resolves.toEqual([
      { subject: "Matematica", media: 6 },
      { subject: "Portugues", media: 8 },
    ]);
  });
});
