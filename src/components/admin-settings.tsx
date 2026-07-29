"use client";

import { useSyncExternalStore } from "react";
import { Button, Card, Chip } from "@heroui/react";
import { Check, Languages, Laptop, Moon, PanelRight, Sun } from "lucide-react";
import { getAdminThemePreference, setAdminThemePreference, subscribeToAdminTheme, type AdminThemePreference } from "@/lib/admin-theme";

const themes: Array<{ value: AdminThemePreference; label: string; description: string; icon: typeof Sun }> = [
  { value: "system", label: "مطابق سیستم", description: "ظاهر پنل با تنظیم دستگاه هماهنگ می‌شود.", icon: Laptop },
  { value: "light", label: "حالت روشن", description: "پس‌زمینه روشن برای محیط‌های پرنور.", icon: Sun },
  { value: "dark", label: "حالت تاریک", description: "کنتراست مناسب برای محیط‌های کم‌نور.", icon: Moon },
];

export function AdminSettings() {
  const theme = useSyncExternalStore(subscribeToAdminTheme, getAdminThemePreference, () => "system");

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card variant="secondary" className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm">
        <Card.Header className="flex-row items-center gap-3 border-b border-[var(--border)] p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"><PanelRight size={20} /></span>
          <div><Card.Title className="text-base font-black">ظاهر پنل</Card.Title><Card.Description className="mt-1 text-xs text-[var(--muted)]">حالت نمایش فقط برای همین مرورگر ذخیره می‌شود.</Card.Description></div>
        </Card.Header>
        <Card.Content className="grid gap-3 p-5 sm:grid-cols-3">
          {themes.map(({ value, label, description, icon: Icon }) => {
            const selected = theme === value;
            return (
              <Button
                key={value}
                type="button"
                variant={selected ? "primary" : "secondary"}
                aria-pressed={selected}
                onPress={() => setAdminThemePreference(value)}
                className={`relative flex h-auto min-h-36 flex-col items-start justify-start gap-3 rounded-xl border p-4 text-right ${selected ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]" : "border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)]"}`}
              >
                <span className={`grid size-10 place-items-center rounded-lg ${selected ? "bg-white/15" : "bg-[var(--surface-tertiary)] text-[var(--muted)]"}`}><Icon size={19} /></span>
                <span className="grid gap-1"><strong className="text-sm">{label}</strong><small className={`text-[11px] font-normal leading-5 ${selected ? "text-white/70" : "text-[var(--muted)]"}`}>{description}</small></span>
                {selected && <Check className="absolute left-3 top-3" size={17} />}
              </Button>
            );
          })}
        </Card.Content>
      </Card>

      <Card variant="secondary" className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm">
        <Card.Header className="flex-row items-center gap-3 border-b border-[var(--border)] p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--warning)]/15 text-[var(--warning)]"><Languages size={20} /></span>
          <div><Card.Title className="text-base font-black">زبان و چیدمان</Card.Title><Card.Description className="mt-1 text-xs text-[var(--muted)]">تنظیمات ثابت رابط مدیریت</Card.Description></div>
        </Card.Header>
        <Card.Content className="grid gap-3 p-5 text-sm">
          <div className="flex items-center justify-between gap-3"><span className="text-[var(--muted)]">زبان پنل</span><Chip size="sm" variant="soft"><Chip.Label>فارسی</Chip.Label></Chip></div>
          <div className="flex items-center justify-between gap-3"><span className="text-[var(--muted)]">جهت رابط</span><Chip size="sm" variant="soft"><Chip.Label>راست‌به‌چپ</Chip.Label></Chip></div>
          <p className="m-0 border-t border-[var(--border)] pt-3 text-xs leading-6 text-[var(--muted)]">تمام منوها، فرم‌ها، کارت‌ها و پنجره‌های پنل مطابق استاندارد RTL نمایش داده می‌شوند.</p>
        </Card.Content>
      </Card>
    </div>
  );
}
