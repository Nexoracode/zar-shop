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
  discountPercent?: number;
  price: string;
  originalPrice?: string;
  image?: { src: string; alt: string };
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
