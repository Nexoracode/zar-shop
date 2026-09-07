import { redirect } from "next/navigation";
import { Gift, UserCheck, Wallet } from "lucide-react";
import { ReferralShare } from "@/components/referral-share";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { requireUser } from "@/modules/auth/session";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getWalletSettings } from "@/modules/settings/wallet-settings";
import { ensureReferralCode } from "@/modules/wallet/referral-code";

export default async function AccountReferralPage() {
  const user = await requireUser();
  const [walletSettings, generalSettings] = await Promise.all([getWalletSettings(), getGeneralStoreSettings()]);
  if (!walletSettings.referralEnabled) redirect("/account");
  const currency = generalSettings.currency;

  const [code, rewarded, pending, earnedAgg] = await Promise.all([
    ensureReferralCode(db, user.id),
    db.referral.count({ where: { referrerId: user.id, status: "REWARDED" } }),
    db.referral.count({ where: { referrerId: user.id, status: "PENDING" } }),
    db.referral.aggregate({ where: { referrerId: user.id, status: "REWARDED" }, _sum: { referrerReward: true } }),
  ]);
  const totalEarned = Number(earnedAgg._sum.referrerReward ?? 0);
  const inviteUrl = `${env.APP_URL}/register?ref=${code}`;

  const stats = [
    { label: "دعوت موفق", value: rewarded.toLocaleString("fa-IR"), icon: UserCheck },
    { label: "در انتظار اولین خرید", value: pending.toLocaleString("fa-IR"), icon: Gift },
    { label: "مجموع پاداش دریافتی", value: formatMoney(totalEarned, currency), icon: Wallet },
  ];

  return (
    <>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><Gift size={20} /></span>
          <div>
            <h2 className="m-0 text-base font-bold">دعوت دوستان</h2>
            <p className="mb-0 mt-0.5 text-xs text-[var(--muted)]">کد معرف خود را به اشتراک بگذارید.</p>
          </div>
        </div>
        <ReferralShare code={code} inviteUrl={inviteUrl} />
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
        <h2 className="m-0 text-sm font-bold">چطور کار می‌کند؟</h2>
        <ol className="m-0 mt-3 grid list-decimal gap-2 pr-5 text-xs leading-7 text-[var(--muted)]">
          <li>دوستتان با کد معرف شما ثبت‌نام می‌کند.</li>
          <li>پس از اولین خرید موفق او، {formatMoney(walletSettings.referralRefereeReward, currency)} به کیف پول دوستتان و {formatMoney(walletSettings.referralReferrerReward, currency)} به کیف پول شما اضافه می‌شود.</li>
          {walletSettings.referralRewardMinOrderAmount > 0 && (
            <li>حداقل مبلغ اولین خرید برای دریافت پاداش، {formatMoney(walletSettings.referralRewardMinOrderAmount, currency)} است.</li>
          )}
        </ol>
      </section>

      <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <Icon size={16} className="text-[var(--brand-primary)]" />
            <strong className="mt-2 block text-base font-bold">{value}</strong>
            <span className="mt-1 block text-[11px] text-[var(--muted)]">{label}</span>
          </div>
        ))}
      </section>
    </>
  );
}
