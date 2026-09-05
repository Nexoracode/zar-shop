"use client";

import { useState, type FormEvent } from "react";
import { toast } from "@heroui/react";
import type { MediaChoice } from "@/components/media-library";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { HomepageSettings } from "@/modules/settings/homepage-settings";
import { homepageFieldLimits } from "@/modules/settings/settings-limits";
import { BpButton, BpInput, BpKicker, BpSwitch } from "./ui";
import { BpHomepageMediaField } from "./homepage-media-field";

type PromoPickerTarget = "desktop" | "mobile";

function toMediaChoice(media: HomepageSettings["promoDesktopMedia"]): MediaChoice | null {
  return media ? { id: media.id, title: media.title || media.alt || "تصویر پروموبنر", url: media.url, type: "IMAGE", mimeType: media.mimeType } : null;
}

export function BlueprintHomepagePromoSettings({ initialSettings }: { initialSettings: HomepageSettings }) {
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
    <form onSubmit={submit} className="grid gap-2">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>تنظیمات پروموبنر</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">بنر اختیاری بالای هدر با تصویر مستقل برای دسکتاپ و موبایل</p>
        <div className="mt-3 grid gap-3">
          <div>
            <BpSwitch isSelected={enabled} onChange={setEnabled}>نمایش پروموبنر</BpSwitch>
            <p className="bp-muted m-0 mt-1.5 text-[12px]">در حالت غیرفعال یا بدون تصویر، فضایی بالای سایت اشغال نمی‌شود.</p>
          </div>
          <BpInput label="لینک مقصد اختیاری" dir="ltr" maxLength={homepageFieldLimits.href} value={href} onChange={(event) => setHref(event.target.value)} placeholder="/products یا https://example.com" />
          <div className="grid gap-2.5 md:grid-cols-2">
            <BpHomepageMediaField label="بنر دسکتاپ" hint="پیشنهاد: ۱۹۲۰×۱۲۰؛ تصویر ثابت یا GIF" media={desktopMedia} aspectClass="aspect-[3/1]" onSelect={() => setPickerTarget("desktop")} onClear={() => setDesktopMedia(null)} />
            <BpHomepageMediaField label="بنر موبایل" hint="پیشنهاد: ۹۰۰×۱۸۰؛ تصویر ثابت یا GIF" media={mobileMedia} aspectClass="aspect-[3/1]" onSelect={() => setPickerTarget("mobile")} onClear={() => setMobileMedia(null)} />
          </div>
        </div>
      </section>
      <section className="bp-frame relative flex flex-col gap-3 p-[16px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px]">این تنظیمات مستقل از سایر بخش‌های صفحه اصلی ذخیره می‌شوند.</p>
        <BpButton type="submit" variant="primary" isPending={saving}>ذخیره</BpButton>
      </section>
    </form>
    <MediaPickerDialog open={pickerTarget !== null} scope="HOMEPAGE" allowedTypes={["IMAGE"]} selected={selectedMedia ? [selectedMedia] : []} onClose={() => setPickerTarget(null)} onConfirm={(items) => { const media = items[0] ?? null; if (pickerTarget === "desktop") setDesktopMedia(media); else if (pickerTarget === "mobile") setMobileMedia(media); setPickerTarget(null); }} />
  </>;
}
