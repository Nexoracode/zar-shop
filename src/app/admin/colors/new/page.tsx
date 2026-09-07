import { redirect } from "next/navigation";
import { requirePermission } from "@/modules/auth/session";

// Colors are created from the list page itself (form beside the table).
export default async function NewColorPage() {
  await requirePermission("catalog:manage");
  redirect("/admin/colors");
}
