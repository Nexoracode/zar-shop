import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/blueprint/admin-login-form";
import { getCurrentUser } from "@/modules/auth/session";
import { isAdminRole } from "@/modules/auth/permissions";
import { getBrandSettings } from "@/modules/settings/brand-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "ورود پنل مدیریت" };

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user && isAdminRole(user.role)) redirect("/admin");

  const [brand, general] = await Promise.all([getBrandSettings(), getGeneralStoreSettings()]);
  const logo = brand.darkLogoMedia ?? brand.mainLogoMedia;

  return (
    <div className="bp-root" data-theme="zar-dark" dir="rtl">
      <div className="grid min-h-dvh bg-[var(--bp-bg)] lg:grid-cols-2">
        <main className="flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-[360px]">
            <div className="mb-9 flex items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--bp-accent)] bg-[var(--bp-accent-100)] text-[var(--bp-accent)]"><ShieldCheck size={18} /></span>
              <strong className="text-[15px] font-bold">{general.storeName}</strong>
            </div>
            <h1 className="m-0 text-[22px] font-bold">ورود به پنل مدیریت</h1>
            <p className="bp-muted m-0 mt-2 text-[13px] leading-6">با شماره موبایل و رمز عبور کارکنان وارد شوید.</p>
            <div className="mt-8"><AdminLoginForm /></div>
          </div>
        </main>

        <aside className="relative hidden items-center justify-center overflow-hidden bg-[var(--bp-card)] lg:flex">
          <div
            className="absolute inset-0 opacity-50"
            style={{ backgroundImage: "radial-gradient(var(--bp-divider) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
            aria-hidden="true"
          />
          <div className="relative z-10 grid max-w-[340px] justify-items-center gap-6 px-10 text-center">
            {logo ? (
              <Image src={logo.url} alt={logo.alt ?? general.storeName} width={160} height={64} className="h-14 w-auto object-contain opacity-95" />
            ) : (
              <strong className="text-2xl font-bold">{general.storeName}</strong>
            )}
            <p className="bp-muted m-0 text-[14px] leading-8">{general.tagline}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
