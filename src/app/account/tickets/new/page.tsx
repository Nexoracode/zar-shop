import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/modules/auth/session";
import { NewTicketComposer } from "@/components/account-ticket-composer";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type Context = { searchParams: Promise<{ productId?: string }> };

export default async function NewTicketPage({ searchParams }: Context) {
  await requireUser();
  const { productId } = await searchParams;

  if (productId) {
    const product = await db.product.findUnique({ where: { id: productId }, select: { id: true, name: true } });
    if (!product) notFound();
    return <NewTicketComposer product={product} categories={[]} />;
  }

  const categories = await db.supportTicketCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  return <NewTicketComposer product={null} categories={categories} />;
}
