import { SignJWT, jwtVerify } from "jose";
import type { SessionUser } from "@/types";

// Módulo compatível com o Edge Runtime (usado também pelo middleware).
// Apenas `jose` — nada de bcrypt/prisma aqui.

export const SESSION_COOKIE = "edugestao_session";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    // Fallback apenas para evitar crash em dev; produção deve definir AUTH_SECRET.
    return new TextEncoder().encode("edugestao-dev-secret-please-change");
  }
  return new TextEncoder().encode(secret);
}

export function sessionMaxAge() {
  return Number(process.env.SESSION_MAX_AGE || 60 * 60 * 24 * 7);
}

/** Gera o JWT da sessão assinado com HS256. */
export async function signSession(user: SessionUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + sessionMaxAge())
    .sign(getSecret());
}

/** Valida o token e retorna o usuário da sessão, ou null se inválido. */
export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.id || !payload.role) return null;
    return {
      id: String(payload.id),
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      role: payload.role as SessionUser["role"],
    };
  } catch {
    return null;
  }
}
