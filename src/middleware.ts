import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";
import { canAccessRoute, ROLE_HOME } from "@/lib/permissions";

// Protege todas as rotas /dashboard e redireciona conforme a role.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySession(token) : null;

  // Já autenticado tentando acessar /login -> vai para sua home
  if (pathname === "/login" && user) {
    const url = req.nextUrl.clone();
    url.pathname = ROLE_HOME[user.role];
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Rotas protegidas
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    if (!canAccessRoute(user.role, pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = ROLE_HOME[user.role];
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
