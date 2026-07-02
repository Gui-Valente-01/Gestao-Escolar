import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession, hashPassword } from "@/lib/auth";
import { loginSchema } from "@/validations";
import { logAction } from "@/lib/audit";
import { ROLE_HOME } from "@/lib/permissions";

function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Dados inválidos" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  let user;
  try {
    user = await prisma.user.findUnique({ where: { email } });
  } catch (err) {
    console.error("[auth.login] banco indisponivel:", err);
    return NextResponse.json(
      { ok: false, error: "Banco de dados indisponível. Verifique se o PostgreSQL está em execução." },
      { status: 503 },
    );
  }

  // Mensagem genérica para não revelar se o e-mail existe
  if (!user || !user.active) {
    return NextResponse.json({ ok: false, error: "E-mail ou senha incorretos" }, { status: 401 });
  }

  const valid = isBcryptHash(user.passwordHash)
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : parsed.data.password === user.passwordHash;
  if (!valid) {
    await logAction({ userId: user.id, action: "auth.login_failed", entity: "User", entityId: user.id });
    return NextResponse.json({ ok: false, error: "E-mail ou senha incorretos" }, { status: 401 });
  }

  if (!isBcryptHash(user.passwordHash)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    });
  }

  await createSession({ id: user.id, name: user.name, email: user.email, role: user.role });
  await logAction({ userId: user.id, action: "auth.login", entity: "User", entityId: user.id });

  return NextResponse.json({ ok: true, redirect: ROLE_HOME[user.role] });
}
