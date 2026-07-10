import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  class: {
    findUnique: vi.fn(),
  },
  teacher: {
    upsert: vi.fn(),
  },
  guardian: {
    upsert: vi.fn(),
  },
  student: {
    upsert: vi.fn(),
  },
  enrollment: {
    upsert: vi.fn(),
  },
}));
const authMock = vi.hoisted(() => ({
  requireRole: vi.fn(),
  hashPassword: vi.fn(),
}));
const auditMock = vi.hoisted(() => ({ logAction: vi.fn() }));
const cacheMock = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => authMock);
vi.mock("@/lib/audit", () => auditMock);
vi.mock("next/cache", () => cacheMock);

import { createUser } from "./actions";

describe("usuarios actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
    authMock.requireRole.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    authMock.hashPassword.mockResolvedValue("hashed-password");
  });

  it("rejeita criacao sem senha", async () => {
    const result = await createUser({
      name: "Maria Silva",
      email: "maria@escola.test",
      role: "ALUNO",
      classId: "class-1",
      password: "",
      active: true,
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ error: "Senha e obrigatoria na criacao." });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("rejeita e-mail duplicado", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1" });

    const result = await createUser({
      name: "Fabio Silva",
      email: "fabio@escola.test",
      role: "DIRETOR",
      password: "12345678",
      active: true,
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ error: "Ja existe um usuario com este e-mail." });
  });

  it("cria usuario com e-mail normalizado e senha hasheada", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "user-1" });

    const result = await createUser({
      name: "Fabio Silva",
      email: "FABIO@ESCOLA.TEST",
      role: "DIRETOR",
      password: "12345678",
      active: true,
    });

    expect(result.ok).toBe(true);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        name: "Fabio Silva",
        email: "fabio@escola.test",
        role: "DIRETOR",
        active: true,
        passwordHash: "hashed-password",
      },
    });
    expect(prismaMock.student.upsert).not.toHaveBeenCalled();
    expect(auditMock.logAction).toHaveBeenCalledWith({
      userId: "admin-1",
      action: "user.create",
      entity: "User",
      entityId: "user-1",
    });
    expect(cacheMock.revalidatePath).toHaveBeenCalledWith("/dashboard/admin/usuarios");
  });

  it("cria perfil e matricula quando o usuario e aluno", async () => {
    prismaMock.class.findUnique.mockResolvedValue({ id: "class-1" });
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "user-1" });
    prismaMock.student.upsert.mockResolvedValue({ id: "student-1" });

    const result = await createUser({
      name: "Maria Silva",
      email: "MARIA@ESCOLA.TEST",
      role: "ALUNO",
      classId: "class-1",
      password: "12345678",
      active: true,
    });

    expect(result.ok).toBe(true);
    expect(prismaMock.class.findUnique).toHaveBeenCalledWith({ where: { id: "class-1" }, select: { id: true } });
    expect(prismaMock.student.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      update: { classId: "class-1" },
      create: {
        userId: "user-1",
        classId: "class-1",
        registration: expect.stringMatching(/^AUTO-/),
      },
      select: { id: true },
    });
    expect(prismaMock.enrollment.upsert).toHaveBeenCalledWith({
      where: { studentId_classId_year: { studentId: "student-1", classId: "class-1", year: expect.any(Number) } },
      update: { status: "ATIVA" },
      create: { studentId: "student-1", classId: "class-1", year: expect.any(Number), status: "ATIVA" },
    });
  });
});
