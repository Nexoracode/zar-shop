import { z } from "zod";
import { ticketFieldLimits } from "@/modules/tickets/limits";

const ticketCategoryFields = {
  name: z.string().trim().min(2).max(ticketFieldLimits.categoryName),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(-10000).max(10000),
};

export const ticketCategorySchema = z.object({
  ...ticketCategoryFields,
  isActive: ticketCategoryFields.isActive.default(true),
  sortOrder: ticketCategoryFields.sortOrder.default(0),
});

// A PATCH updates only the fields it sends — no defaults, so an absent key stays absent
// instead of overwriting the column (e.g. a sort-order-only reorder must not reset isActive).
export const updateTicketCategorySchema = z.object(ticketCategoryFields).partial();

export const createTicketSchema = z
  .object({
    productId: z.string().cuid().nullable().optional(),
    categoryId: z.string().cuid().nullable().optional(),
    body: z.string().trim().min(1).max(ticketFieldLimits.message),
  })
  .superRefine((value, context) => {
    if (!value.productId && !value.categoryId) {
      context.addIssue({ code: "custom", path: ["categoryId"], message: "موضوع تیکت را انتخاب کنید." });
    }
  });

export const ticketMessageSchema = z.object({
  body: z.string().trim().max(ticketFieldLimits.message),
});

export const ticketRatingSchema = z
  .object({
    rating: z.coerce.number().int().min(1).max(5),
    reason: z.string().trim().max(ticketFieldLimits.ratingReason).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.rating <= 3 && !value.reason?.trim()) {
      context.addIssue({ code: "custom", path: ["reason"], message: "لطفاً دلیل امتیاز پایین را بنویسید." });
    }
  });
