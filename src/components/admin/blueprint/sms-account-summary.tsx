import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import type { SmsAccountInspection } from "@/modules/communications/sms-account";
import { BpTag } from "./ui";

function Tile({ label, children, note }: { label: string; children: ReactNode; note?: ReactNode }) {
  return (
    <div className="min-w-0 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
      <span className="bp-muted block text-[11px]">{label}</span>
      <strong className="mt-1 block truncate text-[13px]">{children}</strong>
      {note && <span className="bp-muted mt-0.5 block truncate text-[11px]">{note}</span>}
    </div>
  );
}

export function formatToman(value: number) { return `${value.toLocaleString("fa-IR")} تومان`; }
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("fa-IR");
}

/** What Faraz says about the account behind an API key: owner, plan, wallet and standing. */
export function SmsAccountSummary({ inspection }: { inspection: SmsAccountInspection }) {
  const { profile, balance, warnings } = inspection;
  const expiry = profile?.planExpiresAt ? formatDate(profile.planExpiresAt) : null;
  return (
    <div className="grid gap-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Tile label="صاحب حساب" note={profile?.mobile ? <span dir="ltr">{profile.mobile}</span> : undefined}>{profile?.displayName ?? "نامشخص"}</Tile>
        <Tile label="موجودی حساب" note={balance.smsCount === null ? undefined : `معادل ${balance.smsCount.toLocaleString("fa-IR")} پیامک`}>{balance.amountToman === null ? "نامشخص" : formatToman(balance.amountToman)}</Tile>
        <Tile label="پلن حساب" note={expiry ? `انقضا: ${expiry}` : undefined}>{profile?.planTitle ?? "نامشخص"}</Tile>
        <div className="min-w-0 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
          <span className="bp-muted block text-[11px]">وضعیت حساب</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {profile?.verified === null || profile === null ? null : <BpTag tone={profile.verified ? "success" : "warning"}>{profile.verified ? "احراز هویت‌شده" : "احراز هویت‌نشده"}</BpTag>}
            {profile?.blocked === null || profile === null ? null : <BpTag tone={profile.blocked ? "danger" : "success"}>{profile.blocked ? "مسدود" : "فعال"}</BpTag>}
            {profile === null && <BpTag tone="neutral">نامشخص</BpTag>}
          </div>
        </div>
      </div>
      {warnings.map((warning) => (
        <div key={warning} className="flex items-start gap-2 border border-[var(--bp-warning)] bg-[var(--bp-warning-bg)] p-2.5 text-[12px] leading-6 text-[var(--bp-warning)]">
          <AlertTriangle size={14} className="mt-1 shrink-0" />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
}
