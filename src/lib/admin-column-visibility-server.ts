import "server-only";

import { cookies } from "next/headers";
import { columnVisibilityCookieName, parseHiddenColumnsCookie } from "@/lib/admin-column-visibility";

/** Read a table's hidden-columns cookie on the server, so the first paint already matches. */
export async function readHiddenColumns(tableId: string): Promise<string[]> {
  const cookieStore = await cookies();
  return parseHiddenColumnsCookie(cookieStore.get(columnVisibilityCookieName(tableId))?.value);
}
