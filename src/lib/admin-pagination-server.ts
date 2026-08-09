import "server-only";

import { cookies } from "next/headers";
import { adminPageSizeCookieName, parseAdminPagination } from "@/lib/admin-pagination";

export async function parseAdminPaginationRequest(params: { page?: string; pageSize?: string }) {
  const cookieStore = await cookies();
  return parseAdminPagination(params, cookieStore.get(adminPageSizeCookieName)?.value);
}
