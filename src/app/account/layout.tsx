import type { ReactNode } from "react";
import { AccountSidebar } from "@/components/account-sidebar";
import { requireUser } from "@/modules/auth/session";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const name = user.isGuest ? "خریدار مهمان" : `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.phone || user.email || "کاربر بدون نام";
  return <main className="min-h-[70vh] bg-white px-4 py-7 sm:px-6 sm:py-10" dir="rtl"><div className="mx-auto grid w-full max-w-[1200px] items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]"><AccountSidebar user={{ name, phone: user.phone ?? user.email ?? "—" }} /><div className="grid min-w-0 gap-4">{children}</div></div></main>;
}
