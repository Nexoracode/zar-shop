import { z } from "zod";
import { normalizeNumericValue } from "@/lib/persian-numbers";
import { walletFieldLimits } from "@/modules/settings/settings-limits";

const amount = z
  .union([z.string(), z.number()])
  .transform((value) => Number(normalizeNumericValue(String(value), false)))
  .pipe(z.number().int("مبلغ باید عدد صحیح باشد.").positive("مبلغ باید بزرگ‌تر از صفر باشد.").max(100_000_000_000));

export const walletAdjustmentSchema = z.object({
  direction: z.enum(["credit", "debit"]),
  amount,
  reason: z.string().trim().min(3, "دلیل تعدیل را بنویسید.").max(walletFieldLimits.adjustmentReason),
});

export type WalletAdjustmentInput = z.infer<typeof walletAdjustmentSchema>;
