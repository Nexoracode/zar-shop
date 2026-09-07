import type { Prisma } from "@generated/prisma/client";
import { UserRole, UserStatus } from "@generated/prisma/enums";
import { Plus } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminPrimaryLink } from "@/components/admin-ui";
import { db } from "@/lib/db";
import { userRoleLabels, userStatusLabels } from "@/modules/admin/labels";
import { AdminListFilters } from "@/components/admin-list-filters";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { requirePermission } from "@/modules/auth/session";
import { getWalletSettings } from "@/modules/settings/wallet-settings";
import { BlueprintUsersView } from "@/components/admin/blueprint/users-view";

type SearchParams = Promise<{ q?: string; status?: string; role?: string; page?: string; pageSize?: string }>;

const roles = Object.values(UserRole);
const statuses = Object.values(UserStatus);

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const actor = await requirePermission("users:manage");
  const assignableRoles = actor.role === "ADMIN" ? roles : roles.filter((item) => item !== "ADMIN");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const role = roles.includes(params.role as UserRole) ? params.role as UserRole : undefined;
  const status = statuses.includes(params.status as UserStatus) ? params.status as UserStatus : undefined;
  const { requestedPage, pageSize } = await parseAdminPaginationRequest(params);
  const where: Prisma.UserWhereInput = {
    isGuest: false,
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(query ? { OR: [
      { firstName: { contains: query } },
      { lastName: { contains: query } },
      { email: { contains: query } },
      { phone: { contains: query } },
    ] } : {}),
  };
  const [filteredTotal, walletSettings] = await Promise.all([db.user.count({ where }), getWalletSettings()]);
  const pagination = resolveAdminPagination(filteredTotal, requestedPage, pageSize);
  const users = await db.user.findMany({
    where,
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
    skip: pagination.skip,
    take: pagination.pageSize,
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="مدیریت مشتریان"
        title="کاربران"
        description="اطلاعات تماس، نقش، وضعیت حساب و سابقه سفارش کاربران را بررسی کنید."
        action={<AdminPrimaryLink href="/admin/users/new"><Plus size={17} />کاربر جدید</AdminPrimaryLink>}
      />

      <AdminPanel className="mb-5 p-4 sm:p-5">
        <AdminListFilters path="/admin/users" query={query} queryLabel="جستجوی کاربر" queryPlaceholder="نام، ایمیل یا شماره موبایل" filters={[{ name: "role", label: "نقش کاربر", value: role ?? "", options: [{ value: "", label: "همه نقش‌ها" }, ...roles.map((item) => ({ value: item, label: userRoleLabels[item] }))] }, { name: "status", label: "وضعیت حساب", value: status ?? "", options: [{ value: "", label: "همه وضعیت‌ها" }, ...statuses.map((item) => ({ value: item, label: userStatusLabels[item] }))] }]} />
      </AdminPanel>

      <AdminPanel>
        {!users.length
          ? <AdminEmptyState title="کاربری پیدا نشد" description={query || role || status ? "فیلترها را تغییر دهید و دوباره جستجو کنید." : "هنوز کاربری در فروشگاه ثبت نشده است."} />
          : <BlueprintUsersView users={users} pagination={pagination} actorId={actor.id} actorRole={actor.role} assignableRoles={assignableRoles} walletEnabled={walletSettings.walletEnabled} />}
      </AdminPanel>
    </>
  );
}
