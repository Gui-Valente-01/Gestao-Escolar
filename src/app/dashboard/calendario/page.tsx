import { requireUser, getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { listEventsForUser, getRelevantClassIds } from "@/services/event.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { CalendarioManager } from "./CalendarioManager";

export default async function CalendarioPage() {
  await requireUser();
  const profile = await getCurrentProfile();
  if (!profile) return <div className="card p-8 text-center text-slate-500">Sessão expirada.</div>;

  const canManage = PERMISSIONS.manageEvents(profile.role);
  const events = await listEventsForUser(profile);

  // Turmas disponíveis no formulário (gestão: todas; professor: as que leciona)
  let classes: { id: string; name: string }[] = [];
  if (canManage) {
    if (profile.role === "PROFESSOR") {
      const ids = await getRelevantClassIds(profile);
      classes = await prisma.class.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    } else {
      classes = await prisma.class.findMany({
        select: { id: true, name: true },
        orderBy: [{ year: "desc" }, { name: "asc" }],
      });
    }
  }

  const rows = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    type: e.type,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt ? e.endsAt.toISOString() : null,
    allDay: e.allDay,
    audience: e.audience,
    className: e.class?.name ?? null,
    author: e.author.name,
    canDelete: canManage && (["ADMIN", "DIRETOR", "PEDAGOGA"].includes(profile.role) || e.author.name === profile.name),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário Escolar"
        subtitle="Provas, reuniões, entregas, feriados e eventos da escola e das suas turmas."
      />
      <CalendarioManager events={rows} classes={classes} canManage={canManage} />
    </div>
  );
}
