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

export function storefrontPaginationWindow(page: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (page <= 3) return [1, 2, 3, 4, "ellipsis", totalPages];
  if (page >= totalPages - 2) return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, "ellipsis", page - 1, page, page + 1, "ellipsis", totalPages];
}
