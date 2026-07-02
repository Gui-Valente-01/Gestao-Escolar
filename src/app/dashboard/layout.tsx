import { requireUser } from "@/lib/auth";
import { NAV_BY_ROLE } from "@/lib/permissions";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <DashboardShell user={user} nav={NAV_BY_ROLE[user.role]}>
      {children}
    </DashboardShell>
  );
}
