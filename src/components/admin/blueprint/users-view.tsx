import Link from "next/link";
import { Wallet } from "lucide-react";
import type { Prisma } from "@generated/prisma/client";
import { AdminStatusBadge } from "@/components/admin-ui";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { AdminColumn, AdminColumnSettingsButton, AdminColumnVisibility } from "@/components/admin-column-visibility";
import { AdminPagination } from "@/components/admin-pagination";
import type { resolveAdminPagination } from "@/lib/admin-pagination";
import { formatDate } from "@/lib/format";
import { userStatusLabels, userStatusTones } from "@/modules/admin/labels";
import type { UserRole } from "@generated/prisma/enums";
import { BpTable, BpTd, BpTh } from "./ui";
import { BlueprintUserRoleSelect } from "./user-role-select";

type UserRow = Prisma.UserGetPayload<{ include: { _count: { select: { orders: true } } } }>;

const USERS_TABLE_ID = "users";

export function BlueprintUsersView({ users, pagination, actorId, actorRole, assignableRoles, walletEnabled, initialHiddenColumns }: {
  users: UserRow[];
  pagination: ReturnType<typeof resolveAdminPagination>;
  actorId: string;
  actorRole: UserRole;
  assignableRoles: UserRole[];
  walletEnabled: boolean;
  initialHiddenColumns: string[];
}) {
  const columns = [
    { id: "user", label: "کاربر" },
    { id: "contact", label: "تماس" },
    { id: "role", label: "نقش" },
    { id: "orders", label: "سفارش‌ها" },
    { id: "status", label: "وضعیت" },
    { id: "joined", label: "عضویت" },
    ...(walletEnabled ? [{ id: "wallet", label: "کیف پول" }] : []),
  ];
  return (
    <>
      <div className="md:hidden">
        {users.map((user) => {
          const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "کاربر بدون نام";
          return (
            <article key={user.id} className="flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block truncate text-[13px]">{fullName}</strong>
                  <span className="bp-muted mt-0.5 block truncate text-[11px]">{user.email ?? "ایمیل ثبت نشده"}</span>
                </div>
                <AdminStatusBadge tone={userStatusTones[user.status]}>{userStatusLabels[user.status]}</AdminStatusBadge>
              </div>
              <div className="grid gap-2">
                <BlueprintUserRoleSelect userId={user.id} value={user.role} roles={user.role === "ADMIN" && actorRole !== "ADMIN" ? ["ADMIN"] : assignableRoles} disabled={user.id === actorId || (user.role === "ADMIN" && actorRole !== "ADMIN")} />
                <span className="bp-muted text-[11px]" dir="ltr">{user.phone ?? "شماره ثبت نشده"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 border border-[var(--bp-divider)] p-3 text-[11px]">
                <div><span className="bp-muted block">تعداد سفارش</span><strong className="mt-1 block">{user._count.orders.toLocaleString("fa-IR")}</strong></div>
                <div><span className="bp-muted block">تاریخ عضویت</span><strong className="mt-1 block">{formatDate(user.createdAt)}</strong></div>
              </div>
              {walletEnabled && !user.isGuest && (
                <Link href={`/admin/users/${user.id}/wallet`} className="bp-btn bp-btn-secondary bp-btn-sm w-full gap-2"><Wallet size={14} />کیف پول</Link>
              )}
            </article>
          );
        })}
      </div>

      <AdminColumnVisibility tableId={USERS_TABLE_ID} columns={columns} initialHidden={initialHiddenColumns}>
        <AdminBulkEditor entity="users" entityLabel="کاربر" ids={users.filter((user) => user.id !== actorId && user.role !== "ADMIN").map((user) => user.id)} actions={[{ value: "status:ACTIVE", label: "فعال‌کردن حساب‌ها" }, { value: "status:SUSPENDED", label: "تعلیق حساب‌ها" }]} beforeSelectAll={<AdminColumnSettingsButton />}>
          <BpTable ariaLabel="فهرست کاربران" minWidth={900}>
            <thead>
              <tr>
                <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                <BpTh className="w-10">#</BpTh>
                <AdminColumn id="user"><BpTh>کاربر</BpTh></AdminColumn>
                <AdminColumn id="contact"><BpTh>تماس</BpTh></AdminColumn>
                <AdminColumn id="role"><BpTh>نقش</BpTh></AdminColumn>
                <AdminColumn id="orders"><BpTh>سفارش‌ها</BpTh></AdminColumn>
                <AdminColumn id="status"><BpTh>وضعیت</BpTh></AdminColumn>
                <AdminColumn id="joined"><BpTh>عضویت</BpTh></AdminColumn>
                {walletEnabled && <AdminColumn id="wallet"><BpTh className="text-center">کیف پول</BpTh></AdminColumn>}
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => {
                const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "کاربر بدون نام";
                // Self and other ADMIN accounts are never bulk-selectable — their checkbox is
                // disabled, so the row itself must not toggle selection on click either. A plain
                // `<tr>` for these skips that behavior instead of teaching `AdminBulkTr` about
                // per-row eligibility it has no other reason to know about.
                const selectable = user.id !== actorId && user.role !== "ADMIN";
                const cells = <>
                  <BpTd className="w-10 text-center"><AdminBulkCheckbox id={user.id} label={`انتخاب کاربر ${fullName}`} disabled={!selectable} /></BpTd>
                  <BpTd className="bp-muted">{(pagination.skip + index + 1).toLocaleString("fa-IR")}</BpTd>
                  <AdminColumn id="user">
                    <BpTd className="max-w-[220px]">
                      <div className="min-w-0">
                        <div className="truncate font-bold" title={fullName}>{fullName}</div>
                        <div className="bp-muted truncate text-[11px]" dir="ltr" title={user.email ?? "ایمیل ثبت نشده"}>{user.email ?? "ایمیل ثبت نشده"}</div>
                      </div>
                    </BpTd>
                  </AdminColumn>
                  <AdminColumn id="contact"><BpTd><span dir="ltr">{user.phone ?? "—"}</span></BpTd></AdminColumn>
                  <AdminColumn id="role"><BpTd><BlueprintUserRoleSelect userId={user.id} value={user.role} roles={user.role === "ADMIN" && actorRole !== "ADMIN" ? ["ADMIN"] : assignableRoles} disabled={user.id === actorId || (user.role === "ADMIN" && actorRole !== "ADMIN")} /></BpTd></AdminColumn>
                  <AdminColumn id="orders"><BpTd>{user._count.orders.toLocaleString("fa-IR")}</BpTd></AdminColumn>
                  <AdminColumn id="status"><BpTd><AdminStatusBadge tone={userStatusTones[user.status]}>{userStatusLabels[user.status]}</AdminStatusBadge></BpTd></AdminColumn>
                  <AdminColumn id="joined"><BpTd className="bp-muted">{formatDate(user.createdAt)}</BpTd></AdminColumn>
                  {walletEnabled && (
                    <AdminColumn id="wallet">
                      <BpTd className="text-center">
                        {user.isGuest ? <span className="bp-muted">—</span> : (
                          <Link href={`/admin/users/${user.id}/wallet`} aria-label={`کیف پول ${fullName}`} title="مدیریت کیف پول" className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm"><Wallet size={15} strokeWidth={1.5} /></Link>
                        )}
                      </BpTd>
                    </AdminColumn>
                  )}
                </>;
                return selectable
                  ? <AdminBulkTr key={user.id} id={user.id}>{cells}</AdminBulkTr>
                  : <tr key={user.id}>{cells}</tr>;
              })}
            </tbody>
          </BpTable>
        </AdminBulkEditor>
      </AdminColumnVisibility>
      <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
    </>
  );
}
