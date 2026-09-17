import { redirect } from "next/navigation";
import { requirePermission } from "@/modules/auth/session";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// Colors are created from the list page itself (form beside the table).
export default async function NewColorPage() {
  await requirePermission("catalog:manage");
  redirect("/admin/colors");
}
