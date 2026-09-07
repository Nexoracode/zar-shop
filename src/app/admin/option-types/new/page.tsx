import { redirect } from "next/navigation";
import { requirePermission } from "@/modules/auth/session";

// Option types are created from the list page itself (form beside the table).
export default async function NewOptionTypePage() {
  await requirePermission("catalog:manage");
  redirect("/admin/option-types");
}
