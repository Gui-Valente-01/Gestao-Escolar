import { NextResponse } from "next/server";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function POST() {
  const user = await getCurrentUser();
  destroySession();
  if (user) {
    await logAction({ userId: user.id, action: "auth.logout", entity: "User", entityId: user.id });
  }
  return NextResponse.json({ ok: true });
}
