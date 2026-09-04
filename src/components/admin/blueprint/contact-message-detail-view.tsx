import { CalendarDays, Mail, MessageCircle, Phone, ShieldCheck, User } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { BpKicker, BpTag } from "./ui";
import { BlueprintContactMessageResolveToggle } from "./contact-message-resolve-toggle";

type ContactMessageDetail = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  isResolved: boolean;
  createdAt: Date;
  resolvedAt: Date | null;
};

export function BlueprintContactMessageDetailView({ message }: { message: ContactMessageDetail }) {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <main className="min-w-0">
        <section className="bp-frame relative overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-[var(--bp-divider)] p-[18px] sm:flex-row sm:items-center">
            <span className="grid size-11 shrink-0 place-items-center border border-[var(--bp-divider)] text-[15px] font-bold"><User size={18} /></span>
            <div className="min-w-0 flex-1">
              <strong className="block text-[14px]">{message.name}</strong>
              <div className="bp-muted mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
                <span dir="ltr" className="flex items-center gap-1"><Mail size={12} />{message.email}</span>
                {message.phone && <span dir="ltr" className="flex items-center gap-1"><Phone size={12} />{message.phone}</span>}
                <span className="flex items-center gap-1"><CalendarDays size={12} />{formatDateTime(message.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="p-[18px]">
            <div className="mb-3 flex items-center gap-2"><MessageCircle size={15} className="text-[var(--bp-accent)]" /><strong className="text-[13px]">{message.subject}</strong></div>
            <p className="m-0 whitespace-pre-wrap break-words text-[13px] leading-8">{message.message}</p>
          </div>
        </section>
      </main>

      <aside>
        <section className="bp-frame sticky top-5 overflow-hidden">
          <div className="border-b border-[var(--bp-divider)] p-[18px]">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-accent)]"><ShieldCheck size={18} /></span>
              <div className="min-w-0 flex-1"><BpKicker>وضعیت پیگیری</BpKicker><p className="bp-muted m-0 mt-1 text-[12px] leading-5">وضعیت بررسی این پیام را تغییر دهید.</p></div>
            </div>
            <div className="mt-3 flex items-center justify-between border border-[var(--bp-divider)] px-3 py-2.5">
              <span className="bp-muted text-[12px]">وضعیت فعلی</span>
              <BpTag tone={message.isResolved ? "success" : "warning"}>{message.isResolved ? "بررسی‌شده" : "بررسی‌نشده"}</BpTag>
            </div>
          </div>
          <div className="p-[18px]">
            {message.resolvedAt && <p className="bp-muted m-0 mb-3 text-[11px] leading-5">در {formatDateTime(message.resolvedAt)} بررسی‌شده علامت خورد.</p>}
            <BlueprintContactMessageResolveToggle id={message.id} isResolved={message.isResolved} fullWidth />
          </div>
        </section>
      </aside>
    </div>
  );
}
