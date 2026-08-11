"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { Button, Card, Input, Label, toast } from "@heroui/react";
import { Images, Megaphone, Save, Trash2, Upload } from "lucide-react";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { AdminSectionHelp } from "@/components/admin-section-help";
import { adminFieldClass } from "@/components/admin-ui";
import type { MediaChoice } from "@/components/media-library";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { HomepageSettings } from "@/modules/settings/homepage-settings";

type PromoPickerTarget = "desktop" | "mobile";

function toMediaChoice(media: HomepageSettings["promoDesktopMedia"]): MediaChoice | null {
  return media ? { id: media.id, title: media.title || media.alt || "تصویر پروموبنر", url: media.url, type: "IMAGE", mimeType: media.mimeType } : null;
}

export function HomepagePromoSettings({ initialSettings }: { initialSettings: HomepageSettings }) {
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(initialSettings.promoBannerEnabled);
  const [href, setHref] = useState(initialSettings.promoBannerHref ?? "");
  const [desktopMedia, setDesktopMedia] = useState<MediaChoice | null>(() => toMediaChoice(initialSettings.promoDesktopMedia));
  const [mobileMedia, setMobileMedia] = useState<MediaChoice | null>(() => toMediaChoice(initialSettings.promoMobileMedia));
  const [pickerTarget, setPickerTarget] = useState<PromoPickerTarget | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/homepage/promo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promoBannerEnabled: enabled,
          promoBannerHref: href,
          promoDesktopMediaId: desktopMedia?.id ?? null,
          promoMobileMediaId: mobileMedia?.id ?? null,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره تنظیمات پروموبنر انجام نشد.");
      toast.success("پروموبنر ذخیره شد", { description: "وضعیت نمایش، لینک و تصاویر بنر در سایت اعمال شدند." });
    } catch (reason) {
      toast.danger("ذخیره پروموبنر انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  const selectedMedia = pickerTarget === "desktop" ? desktopMedia : mobileMedia;

  return <>
    <form onSubmit={submit} className="admin-sticky-save-form grid gap-4">
      <Card variant="secondary" className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <Card.Header className="flex items-start gap-3 border-b border-[var(--border)] p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"><Megaphone size={18} /></span>
          <div className="min-w-0 flex-1"><strong className="block text-sm">تنظیمات پروموبنر</strong><p className="m-0 mt-1 text-xs leading-5 text-[var(--muted)]">بنر اختیاری بالای هدر با تصویر مستقل برای دسکتاپ و موبایل</p></div>
          <AdminSectionHelp title="راهنمای پروموبنر" summary="این بنر پیش از هدر فروشگاه نمایش داده می‌شود و می‌تواند به یک مقصد مشخص لینک شود." blocks={[{ title: "روش تنظیم", items: ["نمایش پروموبنر را فعال کنید.", "تصویر دسکتاپ و در صورت نیاز نسخه مخصوص موبایل را انتخاب کنید.", "برای بنر قابل کلیک، لینک مقصد داخلی یا معتبر وارد کنید."] }, { title: "نسخه موبایل", tone: "important", description: "اگر تصویر موبایل انتخاب نشود، تصویر دسکتاپ استفاده می‌شود و ممکن است برش مناسبی نداشته باشد." }]} />
        </Card.Header>
        <Card.Content className="grid gap-4 p-4">
          <AdminCheckbox isSelected={enabled} onChange={setEnabled} icon={<Megaphone size={17} />} description="در حالت غیرفعال یا بدون تصویر، فضایی بالای سایت اشغال نمی‌شود">نمایش پروموبنر</AdminCheckbox>
          <div className="grid gap-1.5"><Label className="text-xs font-bold text-[var(--muted)]">لینک مقصد اختیاری</Label><Input value={href} onChange={(event) => setHref(event.target.value)} dir="ltr" placeholder="/products یا https://example.com" variant="secondary" className={adminFieldClass} /></div>
          <div className="grid gap-3 md:grid-cols-2">
            <PromoMediaField label="بنر دسکتاپ" hint="پیشنهاد: ۱۹۲۰×۱۲۰؛ تصویر ثابت یا GIF" media={desktopMedia} onSelect={() => setPickerTarget("desktop")} onClear={() => setDesktopMedia(null)} />
            <PromoMediaField label="بنر موبایل" hint="پیشنهاد: ۹۰۰×۱۸۰؛ تصویر ثابت یا GIF" media={mobileMedia} onSelect={() => setPickerTarget("mobile")} onClear={() => setMobileMedia(null)} />
          </div>
        </Card.Content>
      </Card>
      <Card variant="secondary" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3"><div><strong className="block text-sm">ذخیره پروموبنر</strong><p className="m-0 mt-1 text-xs text-[var(--muted)]">این تنظیمات مستقل از سایر بخش‌های صفحه اصلی ذخیره می‌شوند.</p></div><Button type="submit" variant="primary" isPending={saving} className="min-h-10 shrink-0 gap-2 px-4 text-xs"><Save size={15} />ذخیره</Button></div>
      </Card>
    </form>
    <MediaPickerDialog open={pickerTarget !== null} scope="HOMEPAGE" allowedTypes={["IMAGE"]} selected={selectedMedia ? [selectedMedia] : []} onClose={() => setPickerTarget(null)} onConfirm={(items) => { const media = items[0] ?? null; if (pickerTarget === "desktop") setDesktopMedia(media); else if (pickerTarget === "mobile") setMobileMedia(media); setPickerTarget(null); }} />
  </>;
}

function PromoMediaField({ label, hint, media, onSelect, onClear }: { label: string; hint: string; media: MediaChoice | null; onSelect: () => void; onClear: () => void }) {
  return <Card variant="secondary" className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] shadow-none">
    <div className="relative aspect-[3/1] bg-[var(--surface)]">{media ? <Image src={media.url} alt={media.title} fill unoptimized={media.mimeType === "image/gif"} sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" /> : <span className="grid h-full place-items-center text-[var(--muted)]"><Images size={26} /></span>}</div>
    <div className="grid gap-2 p-3"><div><strong className="block text-xs">{label}</strong><span className="text-[10px] text-[var(--muted)]">{media?.title || hint}</span></div><div className="flex gap-2"><Button type="button" size="sm" variant="secondary" onPress={onSelect} className="flex-1 gap-1 text-xs"><Upload size={13} />{media ? "تغییر" : "انتخاب"}</Button>{media && <Button type="button" size="sm" isIconOnly variant="danger-soft" aria-label={`حذف ${label}`} onPress={onClear}><Trash2 size={13} /></Button>}</div></div>
  </Card>;
}
