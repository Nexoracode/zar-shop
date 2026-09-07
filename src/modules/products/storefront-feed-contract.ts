import { z } from "zod";

export const storefrontProductSorts = ["LATEST", "POPULAR", "LOW_FEE"] as const;
export type StorefrontProductSort = (typeof storefrontProductSorts)[number];

export const storefrontProductFeedQuerySchema = z.object({
  sort: z.enum(storefrontProductSorts).default("LATEST"),
  page: z.coerce.number().int().positive().default(1),
});

export type StorefrontProductCardItem = {
  id: string;
  href: string;
  name: string;
  category: string;
  industry: "GOLD" | "GENERAL";
  weight: number;
  purity: number;
  makingFee?: { type: "PERCENT" | "FIXED"; value: number };
  discountPercent?: number;
  price: string;
  originalPrice?: string;
  /** When this card's discount stops applying, so a page can refresh itself at that moment. */
  discountEndsAt?: string | null;
  /** Whether the signed-in shopper has this product in their favourites; undefined for guests. */
  isFavorite?: boolean;
  image?: { src: string; alt: string };
  stock?: number;
  rating?: number;
  colors?: Array<{ id: string; name: string; hex: string }>;
};

export type StorefrontProductFeed = {
  items: StorefrontProductCardItem[];
  sort: StorefrontProductSort;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};
