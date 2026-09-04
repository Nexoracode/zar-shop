import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintUserForm } from "@/components/admin/blueprint/user-form";
import { requirePermission } from "@/modules/auth/session";
import { getBrandSettings } from "@/modules/settings/brand-settings";
import { assignableUserRoles } from "@/modules/users/schemas";

export default async function NewUserPage() {
  const actor = await requirePermission("users:manage");
  const brandSettings = await getBrandSettings();
  // Admin-created accounts are Blueprint-only for now; a Classic store falls back to the list.
  if (brandSettings.adminTemplate !== "BLUEPRINT") redirect("/admin/users");

  // Same domain-scoping rule as changing an existing user's role: a USER_MANAGER may only mint
  // CUSTOMER or USER_MANAGER accounts, never ADMIN or another manager role.
  const roleOptions = actor.role === "ADMIN" ? assignableUserRoles : (["CUSTOMER", "USER_MANAGER"] as const);

  return <>
    <AdminPageHeader
      eyebrow="مدیریت مشتریان"
      title="کاربر جدید"
      description="شماره موبایل، رمز عبور اولیه و نقش این کاربر را تعیین کنید."
      backHref="/admin/users"
      backLabel="بازگشت به کاربران"
    />
    <BlueprintUserForm roleOptions={roleOptions} />
  </>;
}
