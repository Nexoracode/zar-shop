import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getPermittedActor } from "@/modules/auth/session";
import { getProductListData } from "@/modules/page-builder/product-list-data";
import { productListConfigSchema } from "@/modules/page-builder/product-lists";

// The products a product list would show, for the page builder's preview of a list that is not saved yet. It changes
// nothing: the configuration is only used to pick the products.
export async function POST(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const config = productListConfigSchema.parse(await request.json());
    return NextResponse.json(await getProductListData(config));
  } catch (error) {
    return apiError(error);
  }
}
