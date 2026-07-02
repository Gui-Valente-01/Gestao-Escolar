import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/permissions";

// Redireciona o usuário para a home do seu perfil.
export default async function DashboardIndex() {
  const user = await requireUser();
  redirect(ROLE_HOME[user.role]);
}
