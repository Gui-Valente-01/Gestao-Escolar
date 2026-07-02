import { requireUser, getCurrentProfile } from "@/lib/auth";
import {
  getContacts,
  getConversationsSummary,
  getConversationMessages,
} from "@/services/message.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { MensagensManager } from "./MensagensManager";

export default async function MensagensPage({
  searchParams,
}: {
  searchParams?: { with?: string };
}) {
  await requireUser();
  const profile = await getCurrentProfile();
  if (!profile) return <div className="card p-8 text-center text-slate-500">Sessão expirada.</div>;

  const [conversations, contacts] = await Promise.all([
    getConversationsSummary(profile.id),
    getContacts(profile),
  ]);

  const withId = searchParams?.with;
  let selected: {
    otherId: string;
    otherName: string;
    otherRole: string;
    messages: { id: string; senderId: string; body: string; createdAt: string }[];
  } | null = null;

  if (withId) {
    const { messages, other } = await getConversationMessages(profile.id, withId);
    if (other) {
      selected = {
        otherId: other.id,
        otherName: other.name,
        otherRole: other.role,
        messages: messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
        })),
      };
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Mensagens" subtitle="Converse com a equipe escolar, professores, responsáveis e alunos." />
      <MensagensManager
        currentUserId={profile.id}
        conversations={conversations.map((c) => ({
          otherId: c.user.id,
          name: c.user.name,
          role: c.user.role,
          lastBody: c.lastBody,
          lastAt: c.lastAt.toISOString(),
          unread: c.unread,
        }))}
        contacts={contacts.map((c) => ({ id: c.id, name: c.name, role: c.role }))}
        selected={selected}
      />
    </div>
  );
}
