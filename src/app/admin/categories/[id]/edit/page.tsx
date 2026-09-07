import { redirect } from "next/navigation";
import { requirePermission } from "@/modules/auth/session";

// Categories are edited from the list page itself (form beside the table).
export default async function EditCategoryPage() {
  await requirePermission("catalog:manage");
  redirect("/admin/categories");
}
