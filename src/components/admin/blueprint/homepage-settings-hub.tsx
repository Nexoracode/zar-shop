"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "@heroui/react";
import { ChevronLeft, Images, LayoutDashboard, ListTree, Megaphone, ShieldCheck } from "lucide-react";
import type { MediaChoice } from "@/components/media-library";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { HomepageLicenseId, HomepageSettings as HomepageSettingsData, HomepageTreasureCardId } from "@/modules/settings/homepage-settings";
import { BpButton, BpInput, BpKicker, BpTabs } from "./ui";
import { BpHomepageMediaField } from "./homepage-media-field";

const treasureCardMeta: Record<HomepageTreasureCardId, { title: string; hint: string }> = {
  UNDER_20: { title: "کمتر از ۲۰ میلیون", hint: "تصویر محصولات مینیمال" },
  FROM_20_TO_60: { title: "۲۰ تا ۶۰ میلیون", hint: "تصویر محصولات روزانه" },
  FROM_60_TO_100: { title: "۶۰ تا ۱۰۰ میلیون", hint: "تصویر محصولات ویژه" },
  OVER_100: { title: "بالاتر از ۱۰۰ میلیون", hint: "تصویر محصولات لوکس" },
};

const homepageLicenseMeta: Record<HomepageLicenseId, { title: string; hint: string }> = {
  SALES: { title: "پروانه فروشندگی طلا", hint: "تصویر پروانه کسب فروشندگی طلا" },
  ONLINE: { title: "پروانه معاملات آنلاین طلا", hint: "تصویر پروانه معاملات آنلاین طلا و جواهر" },
  ENAMAD: { title: "اینماد", hint: "تصویر نماد اعتماد الکترونیکی" },
};

type PickerTarget = `treasure:${HomepageTreasureCardId}` | `license:${HomepageLicenseId}`;

function toMediaChoice(media: HomepageSettingsData["heroDesktopMedia"]): MediaChoice | null {
  return media ? { id: media.id, title: media.title || media.alt || "تصویر صفحه اصلی", url: media.url, type: "IMAGE", mimeType: media.mimeType } : null;
}

function LinkCard({ icon, title, description, href }: { icon: ReactNode; title: string; description: string; href: string }) {
  return (
    <Link href={href} className="bp-frame group relative flex items-center gap-3 p-[14px] transition hover:border-[var(--bp-accent)]">
      <span className="grid size-9 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-accent)]">{icon}</span>
      <div className="min-w-0 flex-1"><strong className="block text-[13px]">{title}</strong><span className="bp-muted mt-0.5 block truncate text-[11px]">{description}</span></div>
      <ChevronLeft size={16} className="bp-muted shrink-0 transition group-hover:-translate-x-0.5 group-hover:text-[var(--bp-accent)]" />
    </Link>
  );
}

export function BlueprintHomepageSettingsHub({ initialSettings, industry }: { initialSettings: HomepageSettingsData; industry: "GOLD" | "GENERAL" }) {
  const [saving, setSaving] = useState(false);
  const sections = initialSettings.sections;
  const tileGroups = initialSettings.tileGroups;
  const [treasureCards, setTreasureCards] = useState(() => initialSettings.treasureCards.map((card) => ({ id: card.id, mediaId: card.mediaId, media: toMediaChoice(card.media) })));
  const [licenses, setLicenses] = useState(() => initialSettings.licenses.map((license) => ({ id: license.id, href: license.href ?? "", media: toMediaChoice(license.media) })));
  const [selectedLicenseId, setSelectedLicenseId] = useState<HomepageLicenseId>("ONLINE");
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/homepage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treasureCards: treasureCards.map((card) => ({ id: card.id, mediaId: card.media?.id ?? null })), licenses: licenses.map((license) => ({ id: license.id, mediaId: license.media?.id ?? null, href: license.href })) }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره تنظیمات صفحه اصلی انجام نشد.");
      toast.success("تنظیمات صفحه اصلی ذخیره شد", { description: "بنرها، تصاویر و تنظیمات عمومی صفحه اصلی در سایت اعمال شدند." });
    } catch (reason) {
      toast.danger("ذخیره تنظیمات صفحه اصلی انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  const treasurePickerCard = pickerTarget?.startsWith("treasure:") ? treasureCards.find((card) => `treasure:${card.id}` === pickerTarget) : null;
  const selectedPickerMedia = pickerTarget?.startsWith("license:")
    ? licenses.find((license) => `license:${license.id}` === pickerTarget)?.media ?? null
    : treasurePickerCard?.media ?? null;
  const selectedLicense = licenses.find((license) => license.id === selectedLicenseId) ?? licenses[1];

  return <>
    <form onSubmit={submit} className="grid gap-2">
      <div className="grid gap-2 lg:grid-cols-2">
        <LinkCard icon={<Megaphone size={17} />} title="پروموبنر بالای سایت" description={initialSettings.promoBannerEnabled ? "فعال" : "غیرفعال"} href="/admin/settings/homepage/promo" />
        <LinkCard icon={<Images size={17} />} title="هیرو صفحه اصلی" description="اسلایدها، تصاویر و لینک‌ها" href="/admin/settings/homepage/hero" />
        <LinkCard icon={<LayoutDashboard size={17} />} title="تایل‌های تصویری" description={`${tileGroups.length.toLocaleString("fa-IR")} ردیف تایل ثبت شده`} href="/admin/settings/homepage/tiles" />
        <LinkCard icon={<LayoutDashboard size={17} />} title="چینش صفحه اصلی" description={`${sections.filter((section) => section.enabled).length.toLocaleString("fa-IR")} بخش فعال از ${sections.length.toLocaleString("fa-IR")}`} href="/admin/settings/homepage/layout" />
        <LinkCard icon={<ListTree size={17} />} title="منوی بالای سایت" description={`${initialSettings.menuItems.length.toLocaleString("fa-IR")} آیتم فعال`} href="/admin/settings/homepage/menu" />
      </div>

      {industry === "GOLD" && <section className="bp-frame relative p-[16px]">
        <BpKicker>تصاویر گنجینه زرگالری</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">برای هر بازه قیمت یک تصویر مستقل انتخاب کنید</p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {treasureCards.map((card) => {
            const meta = treasureCardMeta[card.id];
            return <BpHomepageMediaField key={card.id} label={meta.title} hint={meta.hint} media={card.media} aspectClass="aspect-[4/3]" onSelect={() => setPickerTarget(`treasure:${card.id}`)} onClear={() => setTreasureCards((current) => current.map((item) => item.id === card.id ? { ...item, mediaId: null, media: null } : item))} />;
          })}
        </div>
      </section>}

      {industry === "GOLD" && <section className="bp-frame relative p-[16px]">
        <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-[var(--bp-accent)]" /><BpKicker>مجوزهای فروشگاه</BpKicker></div>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">تصویر و لینک اختیاری سه مجوز نمایش‌داده‌شده در صفحه اصلی</p>
        <div className="mt-3">
          <BpTabs label="مدیریت مجوزهای فروشگاه">
            {licenses.map((license) => (
              <button key={license.id} type="button" role="tab" aria-selected={selectedLicenseId === license.id} className="bp-tab" onClick={() => setSelectedLicenseId(license.id)}>
                {homepageLicenseMeta[license.id].title}
              </button>
            ))}
          </BpTabs>
          {selectedLicense && (
            <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]">
              <BpHomepageMediaField label={homepageLicenseMeta[selectedLicense.id].title} hint={homepageLicenseMeta[selectedLicense.id].hint} media={selectedLicense.media} aspectClass="aspect-[1.42/1]" onSelect={() => setPickerTarget(`license:${selectedLicense.id}`)} onClear={() => setLicenses((current) => current.map((license) => license.id === selectedLicense.id ? { ...license, media: null } : license))} />
              <div>
                <BpInput label="لینک اختیاری مجوز" dir="ltr" value={selectedLicense.href} onChange={(event) => setLicenses((current) => current.map((license) => license.id === selectedLicense.id ? { ...license, href: event.target.value } : license))} placeholder="/pages/licenses یا https://example.com" hint="اگر لینک خالی باشد، تصویر مجوز در سایت قابل کلیک نخواهد بود." />
              </div>
            </div>
          )}
        </div>
      </section>}

      {industry === "GOLD" && (
        <section className="bp-frame relative flex flex-col gap-3 p-[16px] sm:flex-row sm:items-center sm:justify-between">
          <p className="bp-muted m-0 text-[12px]">تصاویر گنجینه و مجوزها با هم ذخیره می‌شوند.</p>
          <BpButton type="submit" variant="primary" isPending={saving}>ذخیره تنظیمات صفحه اصلی</BpButton>
        </section>
      )}
    </form>
    <MediaPickerDialog open={pickerTarget !== null} scope="HOMEPAGE" allowedTypes={["IMAGE"]} selected={selectedPickerMedia ? [selectedPickerMedia] : []} onClose={() => setPickerTarget(null)} onConfirm={(items) => { const media = items[0] ?? null; if (pickerTarget?.startsWith("treasure:")) { const id = pickerTarget.slice("treasure:".length) as HomepageTreasureCardId; setTreasureCards((current) => current.map((card) => card.id === id ? { ...card, mediaId: media?.id ?? null, media } : card)); } else if (pickerTarget?.startsWith("license:")) { const id = pickerTarget.slice("license:".length) as HomepageLicenseId; setLicenses((current) => current.map((license) => license.id === id ? { ...license, media } : license)); } }} />
  </>;
}
