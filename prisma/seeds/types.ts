import type { StoreIndustry } from "../../generated/prisma/enums";

export type DevelopmentCategorySeed = {
  name: string;
  slug: string;
  description: string;
};

export type DevelopmentProductSeed = {
  sku: string;
  name: string;
  slug: string;
  categorySlug: string;
  description: string;
  stock: number;
  featured?: boolean;
  fixedPrice?: string;
  weightGrams?: string;
  makingFeePercent?: string;
  discountPercent?: string;
};

export type DevelopmentStoreSeed = {
  industry: StoreIndustry;
  storeName: string;
  tagline: string;
  shortDescription: string;
  categories: readonly DevelopmentCategorySeed[];
  products: readonly DevelopmentProductSeed[];
};
