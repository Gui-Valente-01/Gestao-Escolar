import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { registerAdminSchema } from "@/validations";
import { logAction } from "@/lib/audit";
import { ROLE_HOME } from "@/lib/permissions";

// Cadastro inicial do administrador.
// Só funciona enquanto não houver nenhum usuário no sistema (bootstrap).
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida" }, { status: 400 });
  }

  const totalUsers = await prisma.user.count();
  if (totalUsers > 0) {
    return NextResponse.json(
      { ok: false, error: "O sistema já foi inicializado. Faça login." },
      { status: 403 },
    );
  }

  const parsed = registerAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;
  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      passwordHash: await hashPassword(password),
      role: "ADMIN",
    },
  });

  await createSession({ id: user.id, name: user.name, email: user.email, role: user.role });
  await logAction({ userId: user.id, action: "auth.bootstrap_admin", entity: "User", entityId: user.id });

  return NextResponse.json({ ok: true, redirect: ROLE_HOME.ADMIN });
}
