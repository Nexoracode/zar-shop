import { redirect } from "next/navigation";
import { requirePermission } from "@/modules/auth/session";

// Option types are edited from the list page itself (form beside the table).
export default async function EditOptionTypePage() {
  await requirePermission("catalog:manage");
  redirect("/admin/option-types");
}
