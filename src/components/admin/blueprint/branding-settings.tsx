"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { toast } from "@heroui/react";
import { Images, Trash2, Upload } from "lucide-react";
import type { MediaChoice } from "@/components/media-library";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { BrandSettings as BrandSettingsData } from "@/modules/settings/brand-settings";
import { BpButton, BpCheckbox, BpColorField, BpKicker } from "./ui";

function toMediaChoice(media: BrandSettingsData["mainLogoMedia"]): MediaChoice | null {
  return media ? { id: media.id, title: media.title || media.alt || "دارایی برند", url: media.url, type: "IMAGE", mimeType: media.mimeType } : null;
}

function AssetRow({ title, hint, media, onSelect, onClear }: { title: string; hint: string; media: MediaChoice | null; onSelect: () => void; onClear: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-2.5">
      <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden bg-[var(--bp-card)] text-[var(--bp-muted)]">
        {media ? <Image src={media.url} alt={media.title} fill sizes="44px" className="object-contain p-1" /> : <Images size={16} />}
      </span>
      <div className="min-w-0 flex-1"><strong className="block text-[13px]">{title}</strong><span className="bp-muted mt-0.5 block truncate text-[11px]">{media?.title ?? hint}</span></div>
      <BpButton type="button" size="sm" onClick={onSelect} className="gap-1.5"><Upload size={13} />{media ? "تغییر" : "انتخاب فایل"}</BpButton>
      {media && <BpButton type="button" isIconOnly size="sm" variant="ghost" className="bp-btn-danger-icon" aria-label={`حذف ${title}`} onClick={onClear}><Trash2 size={13} /></BpButton>}
    </div>
  );
}

export function BlueprintBrandingSettings({ initialSettings, industry }: { initialSettings: BrandSettingsData; industry: "GOLD" | "GENERAL" }) {
  const [saving, setSaving] = useState(false);
  const [colors, setColors] = useState({ primary: initialSettings.brandPrimaryColor, accent: initialSettings.brandAccentColor, background: initialSettings.brandBackgroundColor, danger: initialSettings.brandDangerColor });
  const [enforceContrast, setEnforceContrast] = useState(initialSettings.enforceColorContrast);
  const [stickyHeader, setStickyHeader] = useState(initialSettings.stickyStoreHeader);
  const [compactGrid, setCompactGrid] = useState(initialSettings.compactMobileGrid);
  const [livePrice, setLivePrice] = useState(initialSettings.liveGoldPrice);
  const [assets, setAssets] = useState({ main: toMediaChoice(initialSettings.mainLogoMedia), dark: toMediaChoice(initialSettings.darkLogoMedia), favicon: toMediaChoice(initialSettings.faviconMedia), social: toMediaChoice(initialSettings.socialImageMedia) });
  const [picker, setPicker] = useState<keyof typeof assets | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandPrimaryColor: colors.primary,
          brandAccentColor: colors.accent,
          brandBackgroundColor: colors.background,
          brandDangerColor: colors.danger,
          enforceColorContrast: enforceContrast,
          stickyStoreHeader: stickyHeader,
          compactMobileGrid: compactGrid,
          liveGoldPrice: livePrice,
          mainLogoMediaId: assets.main?.id ?? null,
          darkLogoMediaId: assets.dark?.id ?? null,
          faviconMediaId: assets.favicon?.id ?? null,
          socialImageMediaId: assets.social?.id ?? null,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره ظاهر و برند انجام نشد.");
      toast.success("تنظیمات ظاهر و برند ذخیره شد", { description: "رنگ‌ها، هویت تصویری و قواعد نمایش روی سایت اعمال شدند." });
    } catch (reason) {
      toast.danger("ذخیره ظاهر و برند انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  const selectedMedia = picker ? assets[picker] : null;

  return <>
    <form onSubmit={submit} className="grid gap-2">
      <div className="grid gap-2 lg:grid-cols-2">
        <section className="bp-frame relative p-[16px]">
          <BpKicker>رنگ‌های برند</BpKicker>
          <p className="bp-muted m-0 mt-1 text-[12px] leading-6">رنگ‌های اصلی رابط فروشگاه</p>
          <div className="mt-3 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <BpColorField label="رنگ اصلی" value={colors.primary} onChange={(value) => setColors((current) => ({ ...current, primary: value }))} maxLength={7} />
              <BpColorField label="رنگ تأکیدی" value={colors.accent} onChange={(value) => setColors((current) => ({ ...current, accent: value }))} maxLength={7} />
              <BpColorField label="پس‌زمینه" value={colors.background} onChange={(value) => setColors((current) => ({ ...current, background: value }))} maxLength={7} />
              <BpColorField label="رنگ خطا و هشدار" value={colors.danger} onChange={(value) => setColors((current) => ({ ...current, danger: value }))} maxLength={7} />
            </div>
            <BpCheckbox isSelected={enforceContrast} onChange={() => setEnforceContrast((current) => !current)} className="w-full items-center gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
              <span>
                <strong className="block text-[13px] font-bold">کنترل خودکار دسترس‌پذیری رنگ</strong>
                <span className="bp-muted mt-0.5 block text-[11px] leading-5">رنگ متن روی رنگ اصلی به‌صورت خودکار خوانا انتخاب شود.</span>
              </span>
            </BpCheckbox>
          </div>
        </section>

        <section className="bp-frame relative p-[16px]">
          <BpKicker>لوگو و هویت تصویری</BpKicker>
          <p className="bp-muted m-0 mt-1 text-[12px] leading-6">دارایی‌های اصلی برند در سایت و شبکه‌های اجتماعی</p>
          <div className="mt-3 grid gap-2.5">
            <AssetRow title="لوگوی اصلی" hint="PNG یا WebP شفاف، حداقل عرض ۴۰۰ پیکسل" media={assets.main} onSelect={() => setPicker("main")} onClear={() => setAssets((current) => ({ ...current, main: null }))} />
            <AssetRow title="لوگوی نسخه تیره" hint="برای فوتر و پس‌زمینه‌های تیره" media={assets.dark} onSelect={() => setPicker("dark")} onClear={() => setAssets((current) => ({ ...current, dark: null }))} />
            <AssetRow title="Favicon" hint="PNG یا WebP مربع، حداقل ۵۱۲×۵۱۲" media={assets.favicon} onSelect={() => setPicker("favicon")} onClear={() => setAssets((current) => ({ ...current, favicon: null }))} />
            <AssetRow title="تصویر اشتراک‌گذاری" hint="پیشنهاد: ۱۲۰۰×۶۳۰" media={assets.social} onSelect={() => setPicker("social")} onClear={() => setAssets((current) => ({ ...current, social: null }))} />
          </div>
        </section>
      </div>

      <section className="bp-frame relative p-[16px]">
        <BpKicker>قواعد نمایش</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">ظاهر مشترک صفحات محصول و فهرست</p>
        <div className={`mt-3 grid gap-2.5 ${industry === "GOLD" ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          <BpCheckbox isSelected={stickyHeader} onChange={() => setStickyHeader((current) => !current)} className="w-full items-center gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
            <span><strong className="block text-[13px] font-bold">هدر چسبان</strong><span className="bp-muted mt-0.5 block text-[11px] leading-5">هدر هنگام اسکرول در دسترس بماند.</span></span>
          </BpCheckbox>
          <BpCheckbox isSelected={compactGrid} onChange={() => setCompactGrid((current) => !current)} className="w-full items-center gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
            <span><strong className="block text-[13px] font-bold">گرید فشرده موبایل</strong><span className="bp-muted mt-0.5 block text-[11px] leading-5">محصولات در موبایل دو ستونه باشند.</span></span>
          </BpCheckbox>
          {industry === "GOLD" && (
            <BpCheckbox isSelected={livePrice} onChange={() => setLivePrice((current) => !current)} className="w-full items-center gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
              <span><strong className="block text-[13px] font-bold">بروزرسانی زنده قیمت</strong><span className="bp-muted mt-0.5 block text-[11px] leading-5">نرخ طلا بدون رفرش بروزرسانی شود.</span></span>
            </BpCheckbox>
          )}
        </div>
      </section>

      <section className="bp-frame relative flex flex-col gap-3 p-[16px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px]">رنگ‌ها، لوگوها و قواعد نمایش با هم ذخیره می‌شوند.</p>
        <BpButton type="submit" variant="primary" isPending={saving}>ذخیره تنظیمات ظاهر و برند</BpButton>
      </section>
    </form>
    <MediaPickerDialog open={picker !== null} scope="BRAND" allowedTypes={["IMAGE"]} selected={selectedMedia ? [selectedMedia] : []} onClose={() => setPicker(null)} onConfirm={(items) => { if (picker) setAssets((current) => ({ ...current, [picker]: items[0] ?? null })); }} />
  </>;
}
