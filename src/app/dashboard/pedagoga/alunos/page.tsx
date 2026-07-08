import { requireRole } from "@/lib/auth";
import { getFichas } from "@/services/student-support.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { FichasManager } from "@/components/pedagogia/FichasManager";

export default async function PedagogaAlunosPage() {
  await requireRole(["ADMIN", "DIRETOR", "PEDAGOGA"]);
  const fichas = await getFichas();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fichas dos Alunos"
        subtitle="Laudos, necessidades especiais, anotações de desenvolvimento e contato dos responsáveis."
      />
      <FichasManager fichas={fichas} canManageSupport canAddNote showContact />
    </div>
  );
}
