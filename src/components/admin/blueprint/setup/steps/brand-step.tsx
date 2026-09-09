"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "@heroui/react";
import { Images, Trash2, Upload } from "lucide-react";
import type { MediaChoice } from "@/components/media-library";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import type { BrandSettings } from "@/modules/settings/brand-settings";
import { BpButton, BpColorField, BpKicker } from "../../ui";

type Props = { initial: BrandSettings; onSaved: () => void };

function toChoice(media: BrandSettings["mainLogoMedia"]): MediaChoice | null {
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

export function SetupBrandStep({ initial, onSaved }: Props) {
  const [colors, setColors] = useState({ primary: initial.brandPrimaryColor, accent: initial.brandAccentColor, background: initial.brandBackgroundColor });
  const [assets, setAssets] = useState<{ main: MediaChoice | null; favicon: MediaChoice | null }>({ main: toChoice(initial.mainLogoMedia), favicon: toChoice(initial.faviconMedia) });
  const [picker, setPicker] = useState<"main" | "favicon" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!assets.main || !assets.favicon) {
      setError("انتخاب لوگوی اصلی و فاویکون الزامی است.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await requestJson("/api/admin/settings/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandPrimaryColor: colors.primary,
          brandAccentColor: colors.accent,
          brandBackgroundColor: colors.background,
          brandDangerColor: initial.brandDangerColor,
          enforceColorContrast: initial.enforceColorContrast,
          stickyStoreHeader: initial.stickyStoreHeader,
          compactMobileGrid: initial.compactMobileGrid,
          liveGoldPrice: initial.liveGoldPrice,
          mainLogoMediaId: assets.main.id,
          darkLogoMediaId: initial.darkLogoMediaId,
          faviconMediaId: assets.favicon.id,
          socialImageMediaId: initial.socialImageMediaId,
        }),
      }, { fallbackMessage: "ذخیره برند انجام نشد." });
      toast.success("برند و ظاهر ذخیره شد");
      setSaving(false);
      onSaved();
    } catch (reason) {
      toast.danger("ذخیره انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
      setSaving(false);
    }
  }

  const selected = picker ? assets[picker] : null;

  return (
    <div className="grid gap-2">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>لوگو و فاویکون</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">فایل‌ها را از گالری انتخاب کنید یا در همان پنجره بارگذاری کنید.</p>
        <div className="mt-3 grid gap-2.5">
          <AssetRow title="لوگوی اصلی" hint="PNG یا WebP شفاف، حداقل عرض ۴۰۰ پیکسل" media={assets.main} onSelect={() => setPicker("main")} onClear={() => setAssets((current) => ({ ...current, main: null }))} />
          <AssetRow title="Favicon" hint="PNG یا WebP مربع، حداقل ۵۱۲×۵۱۲" media={assets.favicon} onSelect={() => setPicker("favicon")} onClear={() => setAssets((current) => ({ ...current, favicon: null }))} />
        </div>
        {error && <p role="alert" className="m-0 mt-3 border border-[var(--bp-danger)] bg-[var(--bp-danger-bg)] p-3 text-[12px] leading-6 text-[var(--bp-danger)]">{error}</p>}
      </section>

      <section className="bp-frame relative p-[16px]">
        <BpKicker>رنگ‌های برند</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">رنگ اصلی، تأکیدی و پس‌زمینهٔ رابط فروشگاه.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <BpColorField label="رنگ اصلی" value={colors.primary} maxLength={7} onChange={(value) => setColors((current) => ({ ...current, primary: value }))} />
          <BpColorField label="رنگ تأکیدی" value={colors.accent} maxLength={7} onChange={(value) => setColors((current) => ({ ...current, accent: value }))} />
          <BpColorField label="پس‌زمینه" value={colors.background} maxLength={7} onChange={(value) => setColors((current) => ({ ...current, background: value }))} />
        </div>
      </section>

      <div className="flex justify-end">
        <BpButton type="button" variant="primary" isPending={saving} onClick={() => void save()}>ذخیره و ادامه</BpButton>
      </div>

      <MediaPickerDialog
        open={picker !== null}
        scope="BRAND"
        allowedTypes={["IMAGE"]}
        selected={selected ? [selected] : []}
        onClose={() => setPicker(null)}
        onConfirm={(items) => { if (picker) setAssets((current) => ({ ...current, [picker]: items[0] ?? null })); }}
      />
    </div>
  );
}
