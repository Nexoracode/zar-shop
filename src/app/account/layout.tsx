import type { ReactNode } from "react";
import { AccountMobileTopBar } from "@/components/account-mobile-topbar";
import { AccountSidebar } from "@/components/account-sidebar";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { requireUser } from "@/modules/auth/session";
import { getAccountOrderCounts } from "@/modules/orders/account-summary";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getWalletSettings } from "@/modules/settings/wallet-settings";
import { ensureWallet } from "@/modules/wallet/wallet";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [walletSettings, generalSettings, orderStats] = await Promise.all([getWalletSettings(), getGeneralStoreSettings(), getAccountOrderCounts(user.id)]);
  const showWallet = !user.isGuest && walletSettings.walletEnabled;
  const showReferral = !user.isGuest && walletSettings.referralEnabled;
  const walletBalance = showWallet ? formatMoney((await ensureWallet(db, user.id)).balance.toString(), generalSettings.currency) : undefined;
  const name = user.isGuest ? "خریدار مهمان" : `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.phone || user.email || "کاربر بدون نام";
  return (
    // The site's fixed bottom tab nav (h-[66px], see GeneralHeader/GoldHeader) overlays whatever
    // is at the bottom of the scrollable page below lg; the footer normally absorbs that (it's
    // tall and disposable), but it's intentionally hidden on /account (see AppChrome's
    // hideFooter), so real content — the last menu row, a form's submit button — was ending up
    // stuck under the nav with no way to scroll it into view. Reserve that space explicitly.
    <main className="min-h-[70vh] bg-white pb-[calc(66px+env(safe-area-inset-bottom)+16px)] lg:pb-0" dir="rtl">
      <AccountMobileTopBar showReferral={showReferral} />
      <div className="mx-auto grid w-full max-w-[1200px] items-start gap-4 px-4 py-7 sm:px-6 sm:py-10 lg:grid-cols-[320px_minmax(0,1fr)]">
        <AccountSidebar user={{ name, phone: user.phone ?? user.email ?? "—" }} showWallet={showWallet} showReferral={showReferral} walletBalance={walletBalance} orderStats={orderStats} />
        <div className="grid min-w-0 gap-4">{children}</div>
      </div>
    </main>
  );
}
