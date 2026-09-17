import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { getStoreIndustry } from "@/modules/settings/store-settings";
import { BlueprintOrderDetail } from "@/components/admin/blueprint/order-detail";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type PageParams = Promise<{ id: string }>;

export default async function OrderDetailsPage({ params }: { params: PageParams }) {
  await requirePermission("orders:manage");
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: true,
      items: {
        include: {
          product: {
            select: {
              slug: true,
              media: { orderBy: { position: "asc" }, take: 1, include: { media: true } },
            },
          },
        },
      },
      payments: { orderBy: { createdAt: "desc" } },
      invoice: true,
      promotionRedemptions: { include: { promotion: { select: { title: true, type: true, code: true } } } },
    },
  });

  if (!order) notFound();

  const industry = await getStoreIndustry();
  return <BlueprintOrderDetail order={order} industry={industry} />;
}
