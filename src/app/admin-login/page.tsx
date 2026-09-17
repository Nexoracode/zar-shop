import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/blueprint/admin-login-form";
import { getCurrentUser } from "@/modules/auth/session";
import { isAdminRole } from "@/modules/auth/permissions";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "ورود پنل مدیریت" };

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user && isAdminRole(user.role)) redirect("/admin");

  return (
    <div className="bp-root" dir="rtl">
      <main className="grid min-h-dvh place-items-center bg-[var(--bp-bg)] px-4 py-10">
        <div className="w-full max-w-[380px]">
          <div className="bp-frame relative p-[24px]">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full border border-[var(--bp-accent)] bg-[var(--bp-accent-100)] text-[var(--bp-accent)]"><ShieldCheck size={22} /></div>
            <h1 className="m-0 text-center text-[16px] font-bold">ورود پنل مدیریت</h1>
            <p className="bp-muted m-0 mt-1 text-center text-[12px]">با شماره موبایل و رمز عبور کارکنان وارد شوید.</p>
            <div className="mt-5"><AdminLoginForm /></div>
          </div>
        </div>
      </main>
    </div>
  );
}
