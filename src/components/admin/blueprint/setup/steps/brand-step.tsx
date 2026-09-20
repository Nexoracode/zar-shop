"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "@heroui/react";
import { ArrowLeft, Images, Trash2, Upload } from "lucide-react";
import type { MediaChoice } from "@/components/media-library";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import type { BrandSettings } from "@/modules/settings/brand-settings";
import { BpButton, BpColorField } from "../../ui";
import { SetupFooter, SetupSection } from "../setup-ui";

type Props = { initial: BrandSettings; onBack?: () => void; onSaved: () => void };

function toChoice(media: BrandSettings["mainLogoMedia"]): MediaChoice | null {
  return media ? { id: media.id, title: media.title || media.alt || "دارایی برند", url: media.url, type: "IMAGE", mimeType: media.mimeType } : null;
}

function AssetRow({ title, hint, media, onSelect, onClear }: { title: string; hint: string; media: MediaChoice | null; onSelect: () => void; onClear: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-[var(--bp-radius-sm)] border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-2.5">
      <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-[var(--bp-radius-sm)] border border-[var(--bp-divider)] bg-[var(--bp-card)] text-[var(--bp-muted)]">
        {media ? <Image src={media.url} alt={media.title} fill sizes="44px" className="object-contain p-1" /> : <Images size={16} />}
      </span>
      <div className="min-w-0 flex-1"><strong className="block text-[13px]">{title}</strong><span className="bp-muted mt-0.5 block truncate text-[11px]">{media?.title ?? hint}</span></div>
      <BpButton type="button" size="sm" onClick={onSelect} className="gap-1.5"><Upload size={13} />{media ? "تغییر" : "انتخاب فایل"}</BpButton>
      {media && <BpButton type="button" isIconOnly size="sm" variant="ghost" className="bp-btn-danger-icon" aria-label={`حذف ${title}`} onClick={onClear}><Trash2 size={13} /></BpButton>}
    </div>
  );
}

export function SetupBrandStep({ initial, onBack, onSaved }: Props) {
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
    <div>
      <SetupSection title="لوگو و فاویکون" description="هر دو الزامی‌اند. فایل را از گالری انتخاب کنید یا همان‌جا بارگذاری کنید.">
        <div className="grid gap-2.5">
          <AssetRow title="لوگوی اصلی" hint="PNG یا WebP شفاف، حداقل عرض ۴۰۰ پیکسل" media={assets.main} onSelect={() => setPicker("main")} onClear={() => setAssets((current) => ({ ...current, main: null }))} />
          <AssetRow title="فاویکون" hint="PNG یا WebP مربع، حداقل ۵۱۲×۵۱۲ (آیکون کوچک تب مرورگر)" media={assets.favicon} onSelect={() => setPicker("favicon")} onClear={() => setAssets((current) => ({ ...current, favicon: null }))} />
        </div>
        {error && <p role="alert" className="m-0 mt-3 rounded-[var(--bp-radius-sm)] border border-[var(--bp-danger)] bg-[var(--bp-danger-bg)] p-3 text-[12px] leading-6 text-[var(--bp-danger)]">{error}</p>}
      </SetupSection>

      <SetupSection title="رنگ‌های برند" description="رنگ‌های پیش‌فرض آماده‌اند؛ اگر رنگ مخصوص برندتان را دارید عوضشان کنید." optional>
        <div className="grid gap-3 sm:grid-cols-3">
          <BpColorField label="رنگ اصلی" value={colors.primary} maxLength={7} onChange={(value) => setColors((current) => ({ ...current, primary: value }))} />
          <BpColorField label="رنگ تأکیدی" value={colors.accent} maxLength={7} onChange={(value) => setColors((current) => ({ ...current, accent: value }))} />
          <BpColorField label="پس‌زمینه" value={colors.background} maxLength={7} onChange={(value) => setColors((current) => ({ ...current, background: value }))} />
        </div>
      </SetupSection>

      <SetupFooter
        onBack={onBack}
        hint={!assets.main || !assets.favicon ? "برای ادامه، لوگوی اصلی و فاویکون را انتخاب کنید." : undefined}
        primary={<BpButton type="button" variant="primary" isPending={saving} onClick={() => void save()} className="gap-1.5">ذخیره و ادامه{!saving && <ArrowLeft size={15} />}</BpButton>}
      />

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
