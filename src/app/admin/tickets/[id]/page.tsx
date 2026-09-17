import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { getTicketForAgent } from "@/modules/tickets/service";
import { serializeTicketDetail } from "@/modules/tickets/admin";
import { BlueprintTicketChat } from "@/components/admin/blueprint/ticket-chat";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type Context = { params: Promise<{ id: string }> };

export default async function AdminTicketPage({ params }: Context) {
  const actor = await requirePermission("tickets:manage");
  const { id } = await params;
  const ticket = await getTicketForAgent(db, id);
  if (!ticket) notFound();
  return <BlueprintTicketChat ticket={serializeTicketDetail(ticket)} viewerId={actor.id} />;
}
