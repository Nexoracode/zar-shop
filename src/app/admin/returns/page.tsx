import type { Prisma } from "@generated/prisma/client";
import { ReturnStatus } from "@generated/prisma/enums";
import { CheckCircle2, Clock, PackageX, XCircle } from "lucide-react";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { db } from "@/lib/db";
import { returnStatusLabels } from "@/modules/admin/labels";
import { requirePermission } from "@/modules/auth/session";
import { BlueprintReturnsView, serializeAdminReturnRow } from "@/components/admin/blueprint/returns-view";

type SearchParams = Promise<{ q?: string; status?: string; page?: string; pageSize?: string }>;

const statuses = Object.values(ReturnStatus);
const summaryCards = [
  { status: "PENDING" as const, label: "در انتظار بررسی", icon: Clock },
  { status: "APPROVED" as const, label: "تأییدشده", icon: CheckCircle2 },
  { status: "REJECTED" as const, label: "ردشده", icon: XCircle },
  { status: "COMPLETED" as const, label: "تکمیل‌شده", icon: PackageX },
];

export default async function AdminReturnsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("orders:manage");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = statuses.includes(params.status as ReturnStatus) ? (params.status as ReturnStatus) : undefined;
  const { requestedPage, pageSize } = await parseAdminPaginationRequest(params);

  const where: Prisma.ReturnWhereInput = {
    ...(status ? { status } : {}),
    ...(query ? {
      OR: [
        { order: { is: { orderNumber: { contains: query } } } },
        { reason: { contains: query } },
        { user: { is: { OR: [{ firstName: { contains: query } }, { lastName: { contains: query } }, { phone: { contains: query } }] } } },
      ],
    } : {}),
  };

  const [filteredTotal, statusCounts] = await Promise.all([
    db.return.count({ where }),
    db.return.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countFor = (target: ReturnStatus) => statusCounts.find((row) => row.status === target)?._count._all ?? 0;
  const pagination = resolveAdminPagination(filteredTotal, requestedPage, pageSize);
  const returns = await db.return.findMany({
    where,
    include: {
      order: { select: { id: true, orderNumber: true, total: true } },
      user: { select: { firstName: true, lastName: true, phone: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: pagination.skip,
    take: pagination.pageSize,
  });

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader flush title="درخواست‌های مرجوعی" description="درخواست‌های بازگرداندن سفارش را بررسی، تأیید یا رد کنید." />

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {summaryCards.map(({ status: cardStatus, label, icon: Icon }) => (
          <section key={cardStatus} className="bp-frame relative p-[18px]">
            <div className="flex items-start justify-between gap-3">
              <span className="bp-kicker">{label}</span>
              <Icon size={16} strokeWidth={1.5} className="flex-none text-[var(--bp-accent)]" />
            </div>
            <strong className="mt-2 block text-[22px] font-bold tracking-[-0.02em]">{countFor(cardStatus).toLocaleString("fa-IR")}</strong>
          </section>
        ))}
      </div>

      <section className="bp-frame relative p-4">
        <AdminListFilters
          path="/admin/returns"
          query={query}
          queryLabel="جستجوی مرجوعی"
          queryPlaceholder="شماره سفارش، مشتری یا دلیل"
          filters={[
            {
              name: "status",
              label: "وضعیت",
              value: status ?? "",
              options: [{ value: "", label: "همه وضعیت‌ها" }, ...statuses.map((item) => ({ value: item, label: returnStatusLabels[item] }))],
            },
          ]}
        />
      </section>

      <section className="bp-frame relative">
        {!returns.length ? (
          <AdminEmptyState
            title="درخواستی پیدا نشد"
            description={query || status ? "فیلترها را تغییر دهید و دوباره جستجو کنید." : "هنوز درخواست مرجوعی ثبت نشده است."}
          />
        ) : (
          <BlueprintReturnsView returns={returns.map(serializeAdminReturnRow)} pagination={pagination} />
        )}
      </section>
    </div>
  );
}
