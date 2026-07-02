import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import type { SessionUser } from "@/types";
import { prisma } from "./prisma";
import { ROLE_HOME } from "./permissions";
import {
  SESSION_COOKIE,
  signSession,
  verifySession,
  sessionMaxAge,
} from "./jwt";

// ----------------------------------------------------------------------------
// Senhas
// ----------------------------------------------------------------------------

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ----------------------------------------------------------------------------
// Cookie de sessão
// ----------------------------------------------------------------------------

export async function createSession(user: SessionUser): Promise<void> {
  const token = await signSession(user);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAge(),
  });
}

export function destroySession(): void {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}

// ----------------------------------------------------------------------------
// Leitura da sessão / guards
// ----------------------------------------------------------------------------

/** Retorna o usuário autenticado a partir do cookie, ou null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Exige autenticação; redireciona para /login caso contrário. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Exige que o usuário tenha uma das roles informadas. */
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect(ROLE_HOME[user.role]);
  }
  return user;
}

/**
 * Carrega o usuário do banco com os IDs de perfil vinculados
 * (teacher / student / guardian). Útil para filtrar dados por dono.
 */
export async function getCurrentProfile() {
  const session = await getCurrentUser();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      teacher: { select: { id: true } },
      student: { select: { id: true } },
      guardian: { select: { id: true } },
    },
  });
  if (!user || !user.active) return null;
  return {
    ...session,
    teacherId: user.teacher?.id ?? null,
    studentId: user.student?.id ?? null,
    guardianId: user.guardian?.id ?? null,
  };
}
