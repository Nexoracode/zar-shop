import { z } from "zod";
import type { StorefrontProductCardItem } from "@/modules/products/storefront-feed-contract";

export const storefrontCatalogSorts = ["newest", "oldest", "price-asc", "price-desc", "popular"] as const;
export type StorefrontCatalogSort = (typeof storefrontCatalogSorts)[number];

const optionalTomanAmount = z.preprocess(
  (value) => value === null || value === undefined || value === "" ? undefined : value,
  z.coerce.number().int().nonnegative().max(10_000_000_000).optional(),
);

export const storefrontCatalogQuerySchema = z.object({
  sortby: z.enum(storefrontCatalogSorts).default("newest"),
  MinPrice: optionalTomanAmount,
  MaxPrice: optionalTomanAmount,
  category: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
}).superRefine((query, context) => {
  if (query.MinPrice !== undefined && query.MaxPrice !== undefined && query.MinPrice > query.MaxPrice) {
    context.addIssue({ code: "custom", path: ["MaxPrice"], message: "حداکثر قیمت باید از حداقل قیمت بیشتر باشد." });
  }
});

export type StorefrontCatalogQuery = z.infer<typeof storefrontCatalogQuerySchema>;

export type StorefrontCatalogResult = {
  items: StorefrontProductCardItem[];
  filters: Pick<StorefrontCatalogQuery, "sortby" | "MinPrice" | "MaxPrice" | "category">;
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
};

export function matchesTomanPrice(priceRials: number | null, minPrice?: number, maxPrice?: number) {
  if (minPrice === undefined && maxPrice === undefined) return true;
  if (priceRials === null) return false;
  const priceTomans = priceRials / 10;
  return (minPrice === undefined || priceTomans >= minPrice) && (maxPrice === undefined || priceTomans <= maxPrice);
}
