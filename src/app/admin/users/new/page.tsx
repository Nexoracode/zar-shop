import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintUserForm } from "@/components/admin/blueprint/user-form";
import { requirePermission } from "@/modules/auth/session";
import { assignableUserRoles } from "@/modules/users/schemas";

export default async function NewUserPage() {
  const actor = await requirePermission("users:manage");

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
