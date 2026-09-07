import { redirect } from "next/navigation";
import { requirePermission } from "@/modules/auth/session";

// Colors are edited from the list page itself (form beside the table).
export default async function EditColorPage() {
  await requirePermission("catalog:manage");
  redirect("/admin/colors");
}
