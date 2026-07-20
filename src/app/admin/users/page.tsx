import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import type { Prisma } from "@generated/prisma/client";
type UserRow = Prisma.UserGetPayload<{include:{_count:{select:{orders:true}}}}>;
export default async function UsersPage(){const users=await db.user.findMany({include:{_count:{select:{orders:true}}},orderBy:{createdAt:"desc"},take:100});return <><div className="panel-head"><div><h1>کاربران</h1><span className="meta">کنترل نقش، وضعیت و سوابق خرید</span></div></div><div className="table-wrap"><table><thead><tr><th>کاربر</th><th>تماس</th><th>نقش</th><th>سفارش</th><th>وضعیت</th><th>عضویت</th></tr></thead><tbody>{users.map((u: UserRow)=><tr key={u.id}><td><strong>{u.firstName} {u.lastName}</strong><br/><span className="meta">{u.email}</span></td><td dir="ltr">{u.phone??"—"}</td><td><span className="badge">{u.role}</span></td><td>{u._count.orders}</td><td>{u.status}</td><td>{formatDate(u.createdAt)}</td></tr>)}</tbody></table></div></>}
