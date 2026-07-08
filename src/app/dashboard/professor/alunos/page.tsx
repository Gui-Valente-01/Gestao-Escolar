import { requireRole, getCurrentProfile } from "@/lib/auth";
import { getFichas } from "@/services/student-support.service";
import { getTeacherClasses } from "@/services/teacher.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { FichasManager } from "@/components/pedagogia/FichasManager";

export default async function ProfessorAlunosPage() {
  await requireRole(["ADMIN", "PROFESSOR"]);
  const profile = await getCurrentProfile();
  if (!profile?.teacherId) {
    return <div className="card p-8 text-center text-slate-500">Perfil de professor não encontrado.</div>;
  }

  const classes = await getTeacherClasses(profile.teacherId);
  const fichas = await getFichas(classes.map((c) => c.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meus Alunos"
        subtitle="Veja quais alunos possuem laudo/necessidade especial e registre anotações de desenvolvimento."
      />
      <FichasManager fichas={fichas} canManageSupport={false} canAddNote showContact={false} />
    </div>
  );
}
