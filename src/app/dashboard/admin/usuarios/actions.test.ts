import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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
    authMock.requireRole.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    authMock.hashPassword.mockResolvedValue("hashed-password");
  });

  it("rejeita criacao sem senha", async () => {
    const result = await createUser({
      name: "Maria Silva",
      email: "maria@escola.test",
      role: "ALUNO",
      password: "",
      active: true,
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ error: "Senha é obrigatória na criação." });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("rejeita e-mail duplicado", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1" });

    const result = await createUser({
      name: "Maria Silva",
      email: "maria@escola.test",
      role: "ALUNO",
      password: "12345678",
      active: true,
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ error: "Já existe um usuário com este e-mail." });
  });

  it("cria usuario com e-mail normalizado e senha hasheada", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "user-1" });

    const result = await createUser({
      name: "Maria Silva",
      email: "MARIA@ESCOLA.TEST",
      role: "ALUNO",
      password: "12345678",
      active: true,
    });

    expect(result.ok).toBe(true);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        name: "Maria Silva",
        email: "maria@escola.test",
        role: "ALUNO",
        active: true,
        passwordHash: "hashed-password",
      },
    });
    expect(auditMock.logAction).toHaveBeenCalledWith({
      userId: "admin-1",
      action: "user.create",
      entity: "User",
      entityId: "user-1",
    });
    expect(cacheMock.revalidatePath).toHaveBeenCalledWith("/dashboard/admin/usuarios");
  });
});
