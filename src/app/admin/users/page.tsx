import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

type UserRow = Prisma.UserGetPayload<{ include: { _count: { select: { orders: true } } } }>;

export default async function UsersPage() {
  const users = await db.user.findMany({ include: { _count: { select: { orders: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  const cell = "border-b border-[#e7e6e2] px-4 py-3.5 text-sm";

  return (
    <>
      <div className="mb-6">
        <h1 className="m-0 text-2xl sm:text-3xl">کاربران</h1>
        <span className="text-sm text-[#747982]">کنترل نقش، وضعیت و سوابق خرید</span>
      </div>
      <div className="overflow-x-auto border border-[#e7e6e2] bg-white">
        <table className="w-full min-w-[780px] border-collapse">
          <thead><tr>{["کاربر", "تماس", "نقش", "سفارش", "وضعیت", "عضویت"].map((head) => <th className="border-b border-[#e7e6e2] bg-[#f8f7f4] px-4 py-3.5 text-right text-xs text-[#747982]" key={head}>{head}</th>)}</tr></thead>
          <tbody>{users.map((user: UserRow) => (
            <tr key={user.id} className="hover:bg-[#fbfaf7]">
              <td className={cell}><strong>{user.firstName} {user.lastName}</strong><br /><span className="text-xs text-[#747982]">{user.email}</span></td>
              <td className={cell} dir="ltr">{user.phone ?? "—"}</td><td className={cell}><span className="rounded-sm bg-[#efe5d1] px-2.5 py-1 text-xs text-[#785b27]">{user.role}</span></td>
              <td className={cell}>{user._count.orders}</td><td className={cell}>{user.status}</td><td className={cell}>{formatDate(user.createdAt)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
