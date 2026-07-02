import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { initials } from "@/lib/utils";
import { PerfilForm } from "./PerfilForm";

export default async function PerfilPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <PageHeader title="Meu perfil" subtitle="Consulte seus dados de acesso e altere sua senha." />

      <div className="card max-w-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-lg font-bold text-white">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-800 dark:text-white">{user.name}</h2>
            <p className="truncate text-sm text-slate-500">{user.email}</p>
            <div className="mt-2">
              <Badge tone="brand">{ROLE_LABELS[user.role]}</Badge>
            </div>
          </div>
        </div>
      </div>

      <PerfilForm />
    </div>
  );
}
