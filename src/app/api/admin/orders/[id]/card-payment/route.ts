import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getPermittedActor } from "@/modules/auth/session";
import { CardTransferError, reviewCardTransfer } from "@/modules/payments/card-to-card";
import { cardTransferReviewSchema } from "@/modules/payments/card-to-card-shared";
import { z } from "zod";

const bodySchema = z.intersection(cardTransferReviewSchema, z.object({ paymentId: z.string().cuid() }));

/** An admin's decision on a card-to-card transfer: approve it (the order becomes paid) or reject it with a reason. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getPermittedActor("orders:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const body = bodySchema.parse(await request.json().catch(() => null));
    const result = body.action === "approve"
      ? await reviewCardTransfer({ orderId: id, paymentId: body.paymentId, actorId: actor.id, request, decision: "approve" })
      : await reviewCardTransfer({ orderId: id, paymentId: body.paymentId, actorId: actor.id, request, decision: "reject", reason: body.reason });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CardTransferError) return NextResponse.json({ message: error.message }, { status: error.statusCode });
    return apiError(error);
  }
}
