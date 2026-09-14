import { z } from "zod";

/** One number per field, shared by the form control and the schema — see `brandFieldLimits`. */
export const authorFieldLimits = { name: 120, bio: 2000 } as const;

const optionalText = (max: number) =>
  z.union([z.null(), z.string().trim().max(max)]).transform((value) => value || null);

const authorFields = {
  name: z.string().trim().min(2, "نام نویسنده را وارد کنید.").max(authorFieldLimits.name),
  bio: optionalText(authorFieldLimits.bio),
  avatarMediaId: z.string().cuid().nullable().optional(),
};

export const authorSchema = z.object(authorFields);

// A PATCH updates only the fields it sends, so the update schema carries no defaults (same
// reasoning as `updateBrandSchema`).
export const updateAuthorSchema = z.object(authorFields).partial();
