import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/modules/auth/session";
import { getTicketForUser } from "@/modules/tickets/service";
import { serializeTicketDetail } from "@/modules/tickets/admin";
import { AccountTicketChat } from "@/components/account-ticket-chat";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export default async function AccountTicketPage({ params }: Context) {
  const user = await requireUser();
  const { id } = await params;
  const ticket = await getTicketForUser(db, id, user.id);
  if (!ticket) notFound();
  return <AccountTicketChat ticket={serializeTicketDetail(ticket)} />;
}
