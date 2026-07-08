import { describe, expect, it } from "vitest";
import { canAccessRoute, NAV_BY_ROLE, PERMISSIONS, ROLE_HOME } from "./permissions";

describe("permissions", () => {
  it("libera rotas genericas do dashboard para usuario autenticado", () => {
    expect(canAccessRoute("ALUNO", "/dashboard")).toBe(true);
    expect(canAccessRoute("RESPONSAVEL", "/dashboard/ia")).toBe(true);
  });

  it("bloqueia prefixos de outros perfis", () => {
    expect(canAccessRoute("ALUNO", "/dashboard/professor/notas")).toBe(false);
    expect(canAccessRoute("PROFESSOR", "/dashboard/aluno/notas")).toBe(false);
  });

  it("permite diretor e admin acessarem relatorios escolares", () => {
    expect(PERMISSIONS.viewSchoolReports("ADMIN")).toBe(true);
    expect(PERMISSIONS.viewSchoolReports("DIRETOR")).toBe(true);
    expect(PERMISSIONS.viewSchoolReports("PROFESSOR")).toBe(false);
  });

  it("mantem home por role", () => {
    expect(ROLE_HOME.ADMIN).toBe("/dashboard/admin");
    expect(ROLE_HOME.RESPONSAVEL).toBe("/dashboard/responsavel");
  });

  it("aponta a visao geral para o painel real de cada perfil", () => {
    expect(NAV_BY_ROLE.ADMIN[0]).toMatchObject({ label: "Visão geral", href: ROLE_HOME.ADMIN });
    expect(NAV_BY_ROLE.PROFESSOR[0]).toMatchObject({ label: "Visão geral", href: ROLE_HOME.PROFESSOR });
    expect(Object.values(NAV_BY_ROLE).flat().some((item) => item.href === "/dashboard")).toBe(false);
  });
});
