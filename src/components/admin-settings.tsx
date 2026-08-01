"use client";

import Image from "next/image";
import { useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { Alert, Button, Card, Chip, Input, Label, Tabs, TextArea, toast } from "@heroui/react";
import {
  Bell, Boxes, CheckCircle2, CircleDollarSign, Clock3, CreditCard, Eye, EyeOff, FileQuestion, FileText,
  Globe2, GripVertical, Images, LayoutDashboard, Mail, MapPin, Megaphone, PackageCheck, Palette, Plus, Save,
  Search, Settings2, ShieldCheck, Smartphone, Sparkles, Store, Trash2, Truck, Upload, Users,
} from "lucide-react";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { HeroSelectField } from "@/components/hero-select-field";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { HeroNumberInput } from "@/components/hero-number-input";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { MediaChoice } from "@/components/media-library";
import type { GeneralStoreSettingsInput } from "@/modules/settings/general-settings";
import type { HomepageSectionId, HomepageSettings as HomepageSettingsData } from "@/modules/settings/homepage-settings";
import type { BrandSettings as BrandSettingsData } from "@/modules/settings/brand-settings";
import type { OrderSettings as OrderSettingsData } from "@/modules/settings/order-settings";
import type { CommerceSettings as CommerceSettingsData } from "@/modules/settings/commerce-settings";

const tabClass = "min-h-11 min-w-0 gap-2 whitespace-nowrap rounded-xl px-2 text-xs font-bold sm:px-3";

export function AdminSettings({ initialSettings, initialHomepageSettings, initialBrandSettings, initialOrderSettings, initialCommerceSettings, paymentProviderLabel }: { initialSettings: GeneralStoreSettingsInput; initialHomepageSettings: HomepageSettingsData; initialBrandSettings: BrandSettingsData; initialOrderSettings: OrderSettingsData; initialCommerceSettings: CommerceSettingsData; paymentProviderLabel: string }) {
  const demoAction = (title: string) => toast.info("نسخه نمایشی تنظیمات", { description: `بخش «${title}» پس از تأیید شما به API و دیتابیس متصل می‌شود.` });

  return (
    <div className="grid gap-5">
      <Alert status="accent" className="rounded-xl border border-blue-200 bg-blue-50 text-blue-900">
        <Alert.Description>تب‌های «عمومی»، «صفحه اصلی»، «ظاهر و برند»، «سفارش و انقضا» و «ارسال و پرداخت» به دیتابیس و سایت متصل هستند. سایر تب‌ها فعلاً نمونه رابط کاربری هستند و ذخیره نمی‌شوند.</Alert.Description>
      </Alert>

      <Tabs defaultSelectedKey="general" aria-label="بخش‌های تنظیمات فروشگاه" className="grid gap-5">
        <Tabs.ListContainer className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-sm sm:p-2">
          <Tabs.List className="grid w-full grid-cols-2 gap-1 p-0 md:grid-cols-4 2xl:grid-cols-8">
            <Tabs.Tab id="general" className={tabClass}><Store size={16} />عمومی</Tabs.Tab>
            <Tabs.Tab id="homepage" className={tabClass}><LayoutDashboard size={16} />صفحه اصلی</Tabs.Tab>
            <Tabs.Tab id="branding" className={tabClass}><Palette size={16} />ظاهر و برند</Tabs.Tab>
            <Tabs.Tab id="orders" className={tabClass}><PackageCheck size={16} />سفارش و انقضا</Tabs.Tab>
            <Tabs.Tab id="catalog" className={tabClass}><Boxes size={16} />محصول و طلا</Tabs.Tab>
            <Tabs.Tab id="commerce" className={tabClass}><Truck size={16} />ارسال و پرداخت</Tabs.Tab>
            <Tabs.Tab id="content" className={tabClass}><FileQuestion size={16} />محتوا و FAQ</Tabs.Tab>
            <Tabs.Tab id="seo" className={tabClass}><Search size={16} />SEO و اعلان‌ها</Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="general"><GeneralSettings initialSettings={initialSettings} /></Tabs.Panel>
        <Tabs.Panel id="homepage"><HomepageSettings initialSettings={initialHomepageSettings} /></Tabs.Panel>
        <Tabs.Panel id="branding"><BrandSettings initialSettings={initialBrandSettings} /></Tabs.Panel>
        <Tabs.Panel id="orders"><OrderSettings initialSettings={initialOrderSettings} /></Tabs.Panel>
        <Tabs.Panel id="catalog"><CatalogSettings /></Tabs.Panel>
        <Tabs.Panel id="commerce"><CommerceSettings initialSettings={initialCommerceSettings} paymentProviderLabel={paymentProviderLabel} /></Tabs.Panel>
        <Tabs.Panel id="content"><ContentSettings onDemo={demoAction} /></Tabs.Panel>
        <Tabs.Panel id="seo"><SeoSettings onDemo={demoAction} /></Tabs.Panel>
      </Tabs>
    </div>
  );
}

function GeneralSettings({ initialSettings }: { initialSettings: GeneralStoreSettingsInput }) {
  const [saving, setSaving] = useState(false);
  const [isStoreActive, setIsStoreActive] = useState(initialSettings.isStoreActive);
  const [guestCheckout, setGuestCheckout] = useState(initialSettings.guestCheckout);
  const [maintenanceMode, setMaintenanceMode] = useState(initialSettings.maintenanceMode);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch("/api/admin/settings/general", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, isStoreActive, guestCheckout, maintenanceMode }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره تنظیمات عمومی انجام نشد.");
      toast.success("تنظیمات عمومی ذخیره شد", { description: "تغییرات در سایت و سفارش‌های جدید اعمال شدند." });
    } catch (reason) {
      toast.danger("ذخیره تنظیمات عمومی انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5"><SettingsGrid>
    <SettingCard icon={<Store size={19} />} title="هویت فروشگاه" description="اطلاعات اصلی نمایش‌داده‌شده در سایت و فاکتور">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="نام فروشگاه"><Input name="storeName" required defaultValue={initialSettings.storeName} variant="secondary" className={adminFieldClass} /></Field><Field label="شعار کوتاه"><Input name="tagline" required defaultValue={initialSettings.tagline} variant="secondary" className={adminFieldClass} /></Field></div>
      <Field label="توضیح کوتاه فروشگاه"><TextArea name="shortDescription" required defaultValue={initialSettings.shortDescription} rows={3} variant="secondary" className={adminFieldClass} /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><HeroSelectField name="currency" label="واحد پول" defaultValue={initialSettings.currency} includeEmptyOption={false} options={[{ value: "IRR", label: "ریال" }, { value: "IRT", label: "تومان" }]} /><HeroSelectField name="timezone" label="منطقه زمانی" defaultValue={initialSettings.timezone} includeEmptyOption={false} options={[{ value: "Asia/Tehran", label: "تهران (UTC+3:30)" }]} /></div>
    </SettingCard>
    <SettingCard icon={<MapPin size={19} />} title="اطلاعات تماس و حقوقی" description="برای فوتر، فاکتور و صفحات اعتماد">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="شماره تماس"><Input name="supportPhone" defaultValue={initialSettings.supportPhone ?? ""} dir="ltr" variant="secondary" className={adminFieldClass} /></Field><Field label="ایمیل پشتیبانی"><Input name="supportEmail" type="email" defaultValue={initialSettings.supportEmail ?? ""} dir="ltr" variant="secondary" className={adminFieldClass} /></Field></div>
      <Field label="نشانی فروشگاه"><TextArea name="storeAddress" defaultValue={initialSettings.storeAddress ?? ""} placeholder="نشانی کامل فروشگاه" rows={2} variant="secondary" className={adminFieldClass} /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="شناسه ملی / کد اقتصادی"><Input name="legalIdentifier" defaultValue={initialSettings.legalIdentifier ?? ""} placeholder="برای فاکتور رسمی" variant="secondary" className={adminFieldClass} /></Field><Field label="ساعات پاسخ‌گویی"><Input name="supportHours" defaultValue={initialSettings.supportHours ?? ""} variant="secondary" className={adminFieldClass} /></Field></div>
    </SettingCard>
    <SettingCard icon={<Settings2 size={19} />} title="وضعیت و دسترسی فروشگاه" description="کنترل نمایش عمومی و تجربه حساب کاربری" className="lg:col-span-2">
      <div className="grid gap-3 md:grid-cols-3"><AdminCheckbox isSelected={isStoreActive} onChange={setIsStoreActive} icon={<Globe2 size={17} />} description="فروشگاه برای کاربران قابل مشاهده باشد">فروشگاه فعال</AdminCheckbox><AdminCheckbox isSelected={guestCheckout} onChange={setGuestCheckout} icon={<Users size={17} />} description="خرید بدون ساخت حساب امکان‌پذیر باشد">خرید مهمان</AdminCheckbox><AdminCheckbox isSelected={maintenanceMode} onChange={setMaintenanceMode} icon={<ShieldCheck size={17} />} description="نمایش صفحه در حال بروزرسانی به بازدیدکنندگان">حالت تعمیر و نگهداری</AdminCheckbox></div>
      <div className="flex justify-end border-t border-[var(--border)] pt-4"><Button type="submit" variant="primary" isPending={saving} className="min-w-32">ذخیره تنظیمات</Button></div>
    </SettingCard>
  </SettingsGrid></form>;
}

const homeSectionMeta: Record<HomepageSectionId, { title: string; description: string }> = {
  HERO: { title: "اسلایدر اصلی", description: "بنر، عنوان، توضیح و دکمه اقدام" },
  PROMISES: { title: "مزیت‌های خرید", description: "ضمانت اصالت، ارسال امن و قیمت‌گذاری شفاف" },
  CATEGORIES: { title: "دسته‌بندی‌های منتخب", description: "دسته‌بندی‌های شاخص و فعال فروشگاه" },
  PRODUCTS: { title: "محصولات منتخب", description: "محصولات ویژه و تازه منتشرشده" },
  ABOUT: { title: "معرفی فروشگاه", description: "داستان، ارزش‌ها و شفافیت فروشگاه" },
  CONCIERGE: { title: "خدمات اختصاصی", description: "تضمین اصالت، تحویل و مشاوره انتخاب" },
};

function toMediaChoice(media: HomepageSettingsData["heroDesktopMedia"]): MediaChoice | null {
  return media ? { id: media.id, title: media.title || media.alt || "تصویر صفحه اصلی", url: media.url, type: "IMAGE", mimeType: media.mimeType } : null;
}

function HomepageSettings({ initialSettings }: { initialSettings: HomepageSettingsData }) {
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState(initialSettings.sections);
  const [heroContentMode, setHeroContentMode] = useState(initialSettings.heroContentMode);
  const [heroTitle, setHeroTitle] = useState(initialSettings.heroTitle);
  const [heroDescription, setHeroDescription] = useState(initialSettings.heroDescription);
  const [heroButtonLabel, setHeroButtonLabel] = useState(initialSettings.heroButtonLabel);
  const [desktopMedia, setDesktopMedia] = useState<MediaChoice | null>(() => toMediaChoice(initialSettings.heroDesktopMedia));
  const [mobileMedia, setMobileMedia] = useState<MediaChoice | null>(() => toMediaChoice(initialSettings.heroMobileMedia));
  const [promoBannerEnabled, setPromoBannerEnabled] = useState(initialSettings.promoBannerEnabled);
  const [promoDesktopMedia, setPromoDesktopMedia] = useState<MediaChoice | null>(() => toMediaChoice(initialSettings.promoDesktopMedia));
  const [promoMobileMedia, setPromoMobileMedia] = useState<MediaChoice | null>(() => toMediaChoice(initialSettings.promoMobileMedia));
  const [pickerTarget, setPickerTarget] = useState<"heroDesktop" | "heroMobile" | "promoDesktop" | "promoMobile" | null>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<HomepageSectionId | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: HomepageSectionId; after: boolean } | null>(null);

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    setSections((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateDropTarget(event: DragEvent<HTMLDivElement>, id: HomepageSectionId) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    setDropTarget({ id, after: event.clientY > bounds.top + bounds.height / 2 });
  }

  function dropSection(event: DragEvent<HTMLDivElement>, targetId: HomepageSectionId) {
    event.preventDefault();
    const sourceId = draggedSectionId ?? event.dataTransfer.getData("text/plain") as HomepageSectionId;
    const target = dropTarget?.id === targetId ? dropTarget : { id: targetId, after: false };
    if (sourceId && sourceId !== target.id) {
      setSections((current) => {
        const source = current.find((section) => section.id === sourceId);
        if (!source) return current;
        const remaining = current.filter((section) => section.id !== sourceId);
        const targetIndex = remaining.findIndex((section) => section.id === target.id);
        if (targetIndex < 0) return current;
        const next = [...remaining];
        next.splice(targetIndex + (target.after ? 1 : 0), 0, source);
        return next;
      });
    }
    setDraggedSectionId(null);
    setDropTarget(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch("/api/admin/settings/homepage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, sections, heroContentMode, heroTitle, heroDescription, heroButtonLabel, heroDesktopMediaId: desktopMedia?.id ?? null, heroMobileMediaId: mobileMedia?.id ?? null, promoBannerEnabled, promoDesktopMediaId: promoDesktopMedia?.id ?? null, promoMobileMediaId: promoMobileMedia?.id ?? null }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره تنظیمات صفحه اصلی انجام نشد.");
      toast.success("تنظیمات صفحه اصلی ذخیره شد", { description: "چینش، محتوای اسلایدر و تصاویر در سایت اعمال شدند." });
    } catch (reason) {
      toast.danger("ذخیره تنظیمات صفحه اصلی انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  return <>
    <form onSubmit={submit} className="grid gap-5"><SettingsGrid>
      <SettingCard icon={<LayoutDashboard size={19} />} title="چینش صفحه اصلی" description="برای تغییر ترتیب، هر ردیف را از دستگیره بگیرید و جابه‌جا کنید" className="lg:col-span-[span_7/span_7]">
        <div className="grid gap-2">{sections.map((section, index) => {
          const meta = homeSectionMeta[section.id];
          const isDropBefore = dropTarget?.id === section.id && !dropTarget.after && draggedSectionId !== section.id;
          const isDropAfter = dropTarget?.id === section.id && dropTarget.after && draggedSectionId !== section.id;
          return <div
            key={section.id}
            onDragOver={(event) => updateDropTarget(event, section.id)}
            onDrop={(event) => dropSection(event, section.id)}
            className={`relative flex items-center gap-2 rounded-xl border bg-[var(--surface-secondary)] p-3 transition sm:gap-3 ${draggedSectionId === section.id ? "border-[var(--accent)] opacity-45" : "border-[var(--border)]"} ${isDropBefore ? "before:absolute before:inset-x-2 before:-top-1.5 before:h-0.5 before:rounded-full before:bg-[var(--accent)]" : ""} ${isDropAfter ? "after:absolute after:inset-x-2 after:-bottom-1.5 after:h-0.5 after:rounded-full after:bg-[var(--accent)]" : ""}`}
          >
            <span
              draggable
              onDragStart={(event: DragEvent<HTMLSpanElement>) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", section.id); setDraggedSectionId(section.id); }}
              onDragEnd={() => { setDraggedSectionId(null); setDropTarget(null); }}
              className="shrink-0 cursor-grab active:cursor-grabbing"
            >
              <Button
                type="button"
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label={`جابه‌جایی ${meta.title}؛ با کشیدن یا کلیدهای بالا و پایین`}
                onKeyDown={(event) => { if (event.key === "ArrowUp") { event.preventDefault(); moveSection(index, -1); } else if (event.key === "ArrowDown") { event.preventDefault(); moveSection(index, 1); } }}
                className="pointer-events-none cursor-grab text-[var(--muted)] active:cursor-grabbing"
              ><GripVertical size={17} /></Button>
            </span>
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--surface)] text-xs font-black text-[var(--muted)]">{(index + 1).toLocaleString("fa-IR")}</span>
            <div className="min-w-0 flex-1"><strong className="block text-sm">{meta.title}</strong><span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">{meta.description}</span></div>
            <Chip size="sm" variant="soft" className={section.enabled ? "text-emerald-700" : "text-slate-500"}><Chip.Label>{section.enabled ? "فعال" : "غیرفعال"}</Chip.Label></Chip>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`${section.enabled ? "غیرفعال کردن" : "فعال کردن"} ${meta.title}`} onPress={() => setSections((current) => current.map((item) => item.id === section.id ? { ...item, enabled: !item.enabled } : item))}>{section.enabled ? <Eye size={15} /> : <EyeOff size={15} />}</Button>
            </div>
          </div>;
        })}</div>
      </SettingCard>
      <SettingCard icon={<Images size={19} />} title="اسلایدر اصلی" description="محتوا و تصاویر واکنش‌گرای ابتدای سایت" className="lg:col-span-[span_5/span_5]">
        <HeroSelectField name="heroContentMode" label="نوع نمایش اسلایدر" value={heroContentMode} onValueChange={(value) => setHeroContentMode(value as HomepageSettingsData["heroContentMode"])} includeEmptyOption={false} options={[{ value: "WITH_CONTENT", label: "بنر همراه عنوان، توضیح و دکمه" }, { value: "IMAGE_ONLY", label: "فقط تصویر؛ کل بنر قابل کلیک" }]} />
        {heroContentMode === "WITH_CONTENT" ? <>
          <Field label="عنوان اصلی"><Input required value={heroTitle} onChange={(event) => setHeroTitle(event.target.value)} variant="secondary" className={adminFieldClass} /></Field>
          <Field label="متن کوتاه"><TextArea required value={heroDescription} onChange={(event) => setHeroDescription(event.target.value)} rows={3} variant="secondary" className={adminFieldClass} /></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="متن دکمه"><Input required value={heroButtonLabel} onChange={(event) => setHeroButtonLabel(event.target.value)} variant="secondary" className={adminFieldClass} /></Field><Field label="لینک دکمه"><Input name="heroButtonHref" required defaultValue={initialSettings.heroButtonHref} dir="ltr" variant="secondary" className={adminFieldClass} /></Field></div>
        </> : <>
          <Alert status="accent"><Alert.Description>در این حالت هیچ متن یا دکمه‌ای روی تصویر قرار نمی‌گیرد و تمام سطح بنر به لینک مقصد متصل می‌شود.</Alert.Description></Alert>
          <Field label="لینک مقصد بنر"><Input name="heroButtonHref" required defaultValue={initialSettings.heroButtonHref} dir="ltr" placeholder="/products یا https://example.com" variant="secondary" className={adminFieldClass} /></Field>
        </>}
        <div className="grid gap-3 sm:grid-cols-2"><HomepageMediaField label="تصویر دسکتاپ" hint="پیشنهاد: ۱۹۲۰×۹۰۰" media={desktopMedia} onSelect={() => setPickerTarget("heroDesktop")} onClear={() => setDesktopMedia(null)} /><HomepageMediaField label="تصویر موبایل" hint="پیشنهاد: ۹۰۰×۱۲۰۰" media={mobileMedia} onSelect={() => setPickerTarget("heroMobile")} onClear={() => setMobileMedia(null)} /></div>
      </SettingCard>
      <SettingCard icon={<Megaphone size={19} />} title="پروموبنر بالای سایت" description="بنر اختیاری پیش از هدر؛ پشتیبانی از تصویر ثابت و GIF" className="lg:col-span-2">
        <AdminCheckbox isSelected={promoBannerEnabled} onChange={setPromoBannerEnabled} icon={<Megaphone size={17} />} description="در صورت غیرفعال‌بودن یا نداشتن تصویر، هیچ فضایی بالای سایت اشغال نمی‌شود">نمایش پروموبنر</AdminCheckbox>
        <div className={`grid gap-4 transition ${promoBannerEnabled ? "opacity-100" : "pointer-events-none opacity-45"}`} aria-disabled={!promoBannerEnabled}>
          <Field label="لینک مقصد اختیاری"><Input name="promoBannerHref" defaultValue={initialSettings.promoBannerHref ?? ""} dir="ltr" placeholder="/products یا https://example.com" variant="secondary" className={adminFieldClass} /></Field>
          <div className="grid gap-3 sm:grid-cols-2"><HomepageMediaField label="بنر دسکتاپ" hint="پیشنهاد: ۱۹۲۰×۱۲۰؛ JPG، PNG، WebP یا GIF" media={promoDesktopMedia} onSelect={() => setPickerTarget("promoDesktop")} onClear={() => setPromoDesktopMedia(null)} /><HomepageMediaField label="بنر موبایل" hint="پیشنهاد: ۹۰۰×۱۸۰؛ JPG، PNG، WebP یا GIF" media={promoMobileMedia} onSelect={() => setPickerTarget("promoMobile")} onClear={() => setPromoMobileMedia(null)} /></div>
        </div>
      </SettingCard>
    </SettingsGrid>
      <Card variant="secondary" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><strong className="block text-sm">ذخیره تغییرات صفحه اصلی</strong><p className="m-0 mt-1 text-xs text-[var(--muted)]">چینش بخش‌ها، اسلایدر، تصاویر و پروموبنر با هم ذخیره می‌شوند.</p></div>
          <Button type="submit" variant="primary" isPending={saving} className="min-h-11 shrink-0 gap-2 px-5"><Save size={16} />ذخیره تنظیمات صفحه اصلی</Button>
        </div>
      </Card>
    </form>
    <MediaPickerDialog open={pickerTarget !== null} scope="HOMEPAGE" allowedTypes={["IMAGE"]} selected={pickerTarget === "heroDesktop" ? (desktopMedia ? [desktopMedia] : []) : pickerTarget === "heroMobile" ? (mobileMedia ? [mobileMedia] : []) : pickerTarget === "promoDesktop" ? (promoDesktopMedia ? [promoDesktopMedia] : []) : pickerTarget === "promoMobile" ? (promoMobileMedia ? [promoMobileMedia] : []) : []} onClose={() => setPickerTarget(null)} onConfirm={(items) => { const media = items[0] ?? null; if (pickerTarget === "heroDesktop") setDesktopMedia(media); else if (pickerTarget === "heroMobile") setMobileMedia(media); else if (pickerTarget === "promoDesktop") setPromoDesktopMedia(media); else if (pickerTarget === "promoMobile") setPromoMobileMedia(media); }} />
  </>;
}

function HomepageMediaField({ label, hint, media, onSelect, onClear }: { label: string; hint: string; media: MediaChoice | null; onSelect: () => void; onClear: () => void }) {
  return <Card variant="secondary" className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] shadow-none">
    <div className="relative aspect-[16/9] bg-[var(--surface)]">{media ? <Image src={media.url} alt={media.title} fill unoptimized={media.mimeType === "image/gif"} sizes="(max-width: 640px) 100vw, 320px" className="object-cover" /> : <span className="grid h-full place-items-center text-[var(--muted)]"><Images size={28} /></span>}</div>
    <div className="grid gap-2 p-3"><div><strong className="block text-xs">{label}</strong><span className="text-[10px] text-[var(--muted)]">{media?.title || hint}</span></div><div className="flex gap-2"><Button type="button" size="sm" variant="secondary" onPress={onSelect} className="flex-1 gap-1 text-xs"><Upload size={13} />{media ? "تغییر" : "انتخاب"}</Button>{media && <Button type="button" size="sm" isIconOnly variant="danger-soft" aria-label={`حذف ${label}`} onPress={onClear}><Trash2 size={13} /></Button>}</div></div>
  </Card>;
}

function BrandSettings({ initialSettings }: { initialSettings: BrandSettingsData }) {
  const [saving, setSaving] = useState(false);
  const [colors, setColors] = useState({ primary: initialSettings.brandPrimaryColor, accent: initialSettings.brandAccentColor, background: initialSettings.brandBackgroundColor, danger: initialSettings.brandDangerColor });
  const [enforceContrast, setEnforceContrast] = useState(initialSettings.enforceColorContrast);
  const [stickyHeader, setStickyHeader] = useState(initialSettings.stickyStoreHeader);
  const [compactGrid, setCompactGrid] = useState(initialSettings.compactMobileGrid);
  const [livePrice, setLivePrice] = useState(initialSettings.liveGoldPrice);
  const [assets, setAssets] = useState({ main: toMediaChoice(initialSettings.mainLogoMedia), dark: toMediaChoice(initialSettings.darkLogoMedia), favicon: toMediaChoice(initialSettings.faviconMedia), social: toMediaChoice(initialSettings.socialImageMedia) });
  const [picker, setPicker] = useState<keyof typeof assets | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/brand", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brandPrimaryColor: colors.primary, brandAccentColor: colors.accent, brandBackgroundColor: colors.background, brandDangerColor: colors.danger, enforceColorContrast: enforceContrast, stickyStoreHeader: stickyHeader, compactMobileGrid: compactGrid, liveGoldPrice: livePrice, mainLogoMediaId: assets.main?.id ?? null, darkLogoMediaId: assets.dark?.id ?? null, faviconMediaId: assets.favicon?.id ?? null, socialImageMediaId: assets.social?.id ?? null }) });
      const result = await response.json().catch(() => null); if (!response.ok) throw new Error(result?.message ?? "ذخیره ظاهر و برند انجام نشد.");
      toast.success("تنظیمات ظاهر و برند ذخیره شد", { description: "رنگ‌ها، هویت تصویری و قواعد نمایش روی سایت اعمال شدند." });
    } catch (reason) { toast.danger("ذخیره ظاهر و برند انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" }); } finally { setSaving(false); }
  }

  return <><form onSubmit={submit} className="grid gap-5"><SettingsGrid>
    <SettingCard icon={<Palette size={19} />} title="رنگ‌های برند" description="رنگ‌های اصلی رابط فروشگاه">
      <div className="grid gap-3 sm:grid-cols-2"><BrandColorField label="رنگ اصلی" value={colors.primary} onChange={(value) => setColors((current) => ({ ...current, primary: value }))} /><BrandColorField label="رنگ تأکیدی" value={colors.accent} onChange={(value) => setColors((current) => ({ ...current, accent: value }))} /><BrandColorField label="پس‌زمینه" value={colors.background} onChange={(value) => setColors((current) => ({ ...current, background: value }))} /><BrandColorField label="رنگ خطا و هشدار" value={colors.danger} onChange={(value) => setColors((current) => ({ ...current, danger: value }))} /></div>
      <AdminCheckbox isSelected={enforceContrast} onChange={setEnforceContrast} description="رنگ متن روی رنگ اصلی به‌صورت خودکار خوانا انتخاب شود">کنترل خودکار دسترس‌پذیری رنگ</AdminCheckbox>
    </SettingCard>
    <SettingCard icon={<Sparkles size={19} />} title="لوگو و هویت تصویری" description="دارایی‌های اصلی برند در سایت و شبکه‌های اجتماعی">
      <BrandAssetRow title="لوگوی اصلی" hint="PNG یا WebP شفاف، حداقل عرض ۴۰۰ پیکسل" media={assets.main} onSelect={() => setPicker("main")} onClear={() => setAssets((current) => ({ ...current, main: null }))} /><BrandAssetRow title="لوگوی نسخه تیره" hint="برای فوتر و پس‌زمینه‌های تیره" media={assets.dark} onSelect={() => setPicker("dark")} onClear={() => setAssets((current) => ({ ...current, dark: null }))} /><BrandAssetRow title="Favicon" hint="PNG یا WebP مربع، حداقل ۵۱۲×۵۱۲" media={assets.favicon} onSelect={() => setPicker("favicon")} onClear={() => setAssets((current) => ({ ...current, favicon: null }))} /><BrandAssetRow title="تصویر اشتراک‌گذاری" hint="پیشنهاد: ۱۲۰۰×۶۳۰" media={assets.social} onSelect={() => setPicker("social")} onClear={() => setAssets((current) => ({ ...current, social: null }))} />
    </SettingCard>
    <SettingCard icon={<Smartphone size={19} />} title="قواعد نمایش" description="ظاهر مشترک صفحات محصول و فهرست" className="lg:col-span-2">
      <div className="grid gap-3 md:grid-cols-3"><AdminCheckbox isSelected={stickyHeader} onChange={setStickyHeader} description="هدر هنگام اسکرول در دسترس بماند">هدر چسبان</AdminCheckbox><AdminCheckbox isSelected={compactGrid} onChange={setCompactGrid} description="محصولات در موبایل دو ستونه باشند">گرید فشرده موبایل</AdminCheckbox><AdminCheckbox isSelected={livePrice} onChange={setLivePrice} description="نرخ طلا بدون رفرش بروزرسانی شود">بروزرسانی زنده قیمت</AdminCheckbox></div>
    </SettingCard>
  </SettingsGrid><Card variant="secondary" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><strong className="block text-sm">ذخیره ظاهر و برند سایت</strong><p className="m-0 mt-1 text-xs text-[var(--muted)]">رنگ‌ها، لوگوها و قواعد نمایش با هم ذخیره می‌شوند.</p></div><Button type="submit" variant="primary" isPending={saving} className="min-h-11 gap-2 px-5"><Save size={16} />ذخیره تنظیمات ظاهر و برند</Button></div></Card></form>
    <MediaPickerDialog open={picker !== null} scope="BRAND" allowedTypes={["IMAGE"]} selected={picker && assets[picker] ? [assets[picker]!] : []} onClose={() => setPicker(null)} onConfirm={(items) => { if (picker) setAssets((current) => ({ ...current, [picker]: items[0] ?? null })); }} />
  </>;
}

function BrandColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <Field label={label}><div className="flex items-center gap-2"><span className="relative size-11 shrink-0 overflow-hidden rounded-full border-2 border-[var(--surface)] shadow-sm ring-1 ring-[var(--border)] transition focus-within:ring-2 focus-within:ring-[var(--accent)]" style={{ backgroundColor: value }}><Input type="color" value={value} onChange={(event) => onChange(event.target.value.toUpperCase())} aria-label={`انتخاب ${label}`} variant="secondary" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" /></span><Input value={value} onChange={(event) => onChange(event.target.value)} dir="ltr" maxLength={7} variant="secondary" className={adminFieldClass} /></div></Field>; }
function BrandAssetRow({ title, hint, media, onSelect, onClear }: { title: string; hint: string; media: MediaChoice | null; onSelect: () => void; onClear: () => void }) { return <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3"><span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--surface)] text-[var(--muted)]">{media ? <Image src={media.url} alt={media.title} fill sizes="48px" className="object-contain p-1" /> : <Images size={18} />}</span><div className="min-w-0 flex-1"><strong className="block text-sm">{title}</strong><span className="mt-0.5 block text-[11px] text-[var(--muted)]">{media?.title ?? hint}</span></div><Button type="button" size="sm" variant="secondary" onPress={onSelect} className="gap-1.5"><Upload size={14} />{media ? "تغییر" : "انتخاب فایل"}</Button>{media && <Button type="button" isIconOnly size="sm" variant="danger-soft" aria-label={`حذف ${title}`} onPress={onClear}><Trash2 size={14} /></Button>}</div>; }

function OrderSettings({ initialSettings }: { initialSettings: OrderSettingsData }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const set = <Key extends keyof OrderSettingsData>(key: Key, value: OrderSettingsData[Key]) => setSettings((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره تنظیمات سفارش انجام نشد.");
      setSettings(result as OrderSettingsData);
      toast.success("تنظیمات سفارش ذخیره شد", { description: "قواعد جدید روی سفارش‌های بعدی و فرایند انقضا اعمال می‌شوند." });
    } catch (reason) {
      toast.danger("ذخیره تنظیمات سفارش انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally { setSaving(false); }
  }

  return <form onSubmit={submit} className="grid gap-5"><SettingsGrid>
    <SettingCard icon={<Clock3 size={19} />} title="انقضای سفارش‌های بدون اقدام" description="مانند فروشگاه‌های بزرگ، سفارش پرداخت‌نشده پس از مهلت تعیین‌شده منقضی می‌شود" className="lg:col-span-2">
      <div className="grid gap-5 lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.3fr)]">
        <div className="grid content-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <span className="grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-700"><Clock3 size={21} /></span>
          <div><span className="text-xs text-amber-700">مهلت فعلی پرداخت</span><strong className="mt-1 block text-2xl font-black">{settings.orderExpirationEnabled ? `${settings.orderExpirationMinutes.toLocaleString("fa-IR")} دقیقه` : "غیرفعال"}</strong></div>
          <p className="m-0 text-xs leading-6 text-amber-800">اگر مشتری در این زمان پرداخت را کامل نکند، سفارش مطابق اقدام انتخاب‌شده پردازش و ظرفیت پروموشن آزاد می‌شود.</p>
          <Chip size="sm" variant="soft" className="w-fit text-amber-800"><Chip.Label>فقط سفارش‌های در انتظار پرداخت</Chip.Label></Chip>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2"><Field label="زمان انقضا (دقیقه)"><HeroNumberInput value={settings.orderExpirationMinutes} onValueChange={(value) => set("orderExpirationMinutes", Number(value))} min={1} max={1440} variant="secondary" className={adminFieldClass} /></Field><Field label="هشدار قبل از انقضا (دقیقه)"><HeroNumberInput value={settings.orderWarningMinutes} onValueChange={(value) => set("orderWarningMinutes", Number(value))} min={0} max={1439} variant="secondary" className={adminFieldClass} /></Field></div>
          <div className="grid gap-4 sm:grid-cols-2"><HeroSelectField name="order-expiration-start" label="شروع شمارش زمان از" value={settings.orderExpirationStart} onValueChange={(value) => set("orderExpirationStart", value as OrderSettingsData["orderExpirationStart"])} includeEmptyOption={false} options={[{ value: "CREATED_AT", label: "زمان ایجاد سفارش" }, { value: "PAYMENT_STARTED_AT", label: "زمان ورود به درگاه" }]} /><HeroSelectField name="order-expiration-action" label="اقدام پس از پایان مهلت" value={settings.orderExpirationAction} onValueChange={(value) => set("orderExpirationAction", value as OrderSettingsData["orderExpirationAction"])} includeEmptyOption={false} options={[{ value: "EXPIRE", label: "منقضی‌کردن خودکار سفارش" }, { value: "CANCEL", label: "لغو خودکار سفارش" }, { value: "NOTIFY", label: "فقط ثبت هشدار برای مدیر" }]} /></div>
          <AdminCheckbox isSelected={settings.showOrderCountdown} onChange={(value) => set("showOrderCountdown", value)} description="شمارش معکوس مهلت پرداخت در حساب مشتری دیده شود">نمایش شمارش معکوس به مشتری</AdminCheckbox>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2"><AdminCheckbox isSelected={settings.orderExpirationEnabled} onChange={(value) => set("orderExpirationEnabled", value)} description="فقط سفارش‌های در انتظار پرداخت بررسی می‌شوند">انقضای خودکار سفارش</AdminCheckbox><AdminCheckbox isSelected={settings.restorePromotionOnExpiry} onChange={(value) => set("restorePromotionOnExpiry", value)} description="کد تخفیف یا پاداش رزروشده دوباره قابل استفاده شود">بازگرداندن ظرفیت پروموشن</AdminCheckbox></div>
      <Alert status="warning"><Alert.Description>پرداخت تأییدشده در رقابت هم‌زمان با انقضا اولویت دارد. پردازش وضعیت سفارش، پرداخت و پروموشن داخل تراکنش و به‌صورت idempotent انجام می‌شود.</Alert.Description></Alert>
    </SettingCard>
    <SettingCard icon={<PackageCheck size={19} />} title="قواعد ثبت سفارش" description="محدودیت‌ها و شماره‌گذاری سفارش">
      <div className="grid items-start gap-4 sm:grid-cols-2"><Field label="حداقل مبلغ سفارش (ریال)"><HeroNumberInput value={settings.minimumOrderAmount} onValueChange={(value) => set("minimumOrderAmount", Number(value))} isPrice variant="secondary" className={adminFieldClass} /></Field><Field label="پیشوند شماره سفارش"><Input value={settings.orderNumberPrefix} onChange={(event) => set("orderNumberPrefix", event.target.value.toUpperCase())} dir="ltr" maxLength={10} variant="secondary" className={adminFieldClass} /><p aria-hidden="true" className="mt-1.5 min-h-4 text-[10px] leading-4">&nbsp;</p></Field></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="حداکثر تعداد هر قلم"><HeroNumberInput value={settings.maxOrderItemQuantity} onValueChange={(value) => set("maxOrderItemQuantity", Number(value))} min={1} max={100} variant="secondary" className={adminFieldClass} /></Field><HeroSelectField name="order-default-status" label="وضعیت اولیه" value="PENDING_PAYMENT" disabled includeEmptyOption={false} options={[{ value: "PENDING_PAYMENT", label: "در انتظار پرداخت (ثابت)" }]} /></div>
      <AdminCheckbox isSelected={settings.revalidateGoldAtCheckout} onChange={(value) => set("revalidateGoldAtCheckout", value)} description="پیش از ساخت سفارش، نرخ طلا از منبع اصلی دوباره دریافت و مبلغ سمت سرور محاسبه شود">بازبینی نرخ طلا هنگام ثبت سفارش</AdminCheckbox>
    </SettingCard>
  </SettingsGrid><Card variant="secondary" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><strong className="block text-sm">ذخیره تنظیمات سفارش و انقضا</strong><p className="m-0 mt-1 text-xs text-[var(--muted)]">تمام قواعد این تب با هم ذخیره و روی سفارش‌های جدید اعمال می‌شوند.</p></div><Button type="submit" variant="primary" isPending={saving} className="min-h-11 gap-2 px-5"><Save size={16} />ذخیره تنظیمات</Button></div></Card></form>;
}

function CatalogSettings() {
  return <SettingsGrid>
    <SettingCard icon={<Boxes size={19} />} title="موجودی و کاتالوگ" description="قواعد عمومی محصولات و تنوع‌ها">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="آستانه هشدار موجودی کم"><HeroNumberInput defaultValue="3" min={0} variant="secondary" className={adminFieldClass} /></Field><Field label="تعداد محصولات هر صفحه"><HeroNumberInput defaultValue="24" min={1} variant="secondary" className={adminFieldClass} /></Field></div>
      <AdminCheckbox defaultSelected description="محصول بدون موجودی در نتایج فروشگاه نمایش داده نشود">مخفی‌کردن محصولات ناموجود</AdminCheckbox><AdminCheckbox defaultSelected description="نمایش امتیاز و دیدگاه تأییدشده در صفحه محصول">دیدگاه و امتیاز مشتریان</AdminCheckbox><AdminCheckbox description="اجازه ثبت سفارش بیشتر از موجودی فعلی">پیش‌فروش / Backorder</AdminCheckbox>
    </SettingCard>
    <SettingCard icon={<CircleDollarSign size={19} />} title="نرخ طلا و قیمت‌گذاری" description="رفتار نرخ لحظه‌ای و وضعیت منبع قیمت">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="فاصله بروزرسانی نرخ (ثانیه)"><HeroNumberInput defaultValue="60" min={10} variant="secondary" className={adminFieldClass} /></Field><Field label="حداکثر عمر نرخ جایگزین (دقیقه)"><HeroNumberInput defaultValue="15" min={1} variant="secondary" className={adminFieldClass} /></Field></div>
      <HeroSelectField name="gold-source" label="منبع نرخ اصلی" defaultValue="primary" includeEmptyOption={false} options={[{ value: "primary", label: "سرویس نرخ طلای اصلی" }, { value: "manual", label: "نرخ دستی اضطراری" }]} />
      <AdminCheckbox defaultSelected description="اگر نرخ معتبر در دسترس نبود، امکان ثبت سفارش متوقف شود">توقف فروش هنگام نامعتبر بودن نرخ</AdminCheckbox><AdminCheckbox defaultSelected description="نرخ، وزن، اجرت، سود و مالیات در سفارش ثابت بماند">Snapshot کامل اجزای قیمت</AdminCheckbox>
      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><span className="flex items-center gap-2 font-bold"><CheckCircle2 size={16} />منبع نرخ اصلی متصل است</span><Chip size="sm" variant="soft"><Chip.Label>نمونه نمایشی</Chip.Label></Chip></div>
    </SettingCard>
  </SettingsGrid>;
}

function CommerceSettings({ initialSettings, paymentProviderLabel }: { initialSettings: CommerceSettingsData; paymentProviderLabel: string }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const set = <Key extends keyof CommerceSettingsData>(key: Key, value: CommerceSettingsData[Key]) => setSettings((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/commerce", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره تنظیمات ارسال و پرداخت انجام نشد.");
      setSettings(result as CommerceSettingsData);
      toast.success("تنظیمات ارسال و پرداخت ذخیره شد", { description: "روش‌های تحویل و محاسبه هزینه روی checkout اعمال شدند." });
    } catch (reason) {
      toast.danger("ذخیره تنظیمات ارسال و پرداخت انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally { setSaving(false); }
  }

  return <form onSubmit={submit} className="grid gap-5"><div className="grid items-start gap-5 lg:grid-cols-[minmax(280px,0.82fr)_minmax(0,1.18fr)]">
    <SettingCard icon={<CreditCard size={19} />} title="روش‌های پرداخت" description="درگاه‌ها و ترتیب نمایش در تسویه حساب">
      <AdminCheckbox isSelected={settings.onlinePaymentEnabled} onChange={(value) => set("onlinePaymentEnabled", value)} icon={<CreditCard size={18} />} description="در صورت غیرفعال‌شدن، ایجاد سفارش و انتقال به درگاه متوقف می‌شود">پرداخت آنلاین</AdminCheckbox>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800"><span className="flex items-center gap-2 text-sm font-bold"><CheckCircle2 size={17} />درگاه پیکربندی‌شده</span><Chip size="sm" variant="soft"><Chip.Label>{paymentProviderLabel}</Chip.Label></Chip></div>
      <Alert status="accent"><Alert.Description>کارت‌به‌کارت و پرداخت حضوری تا زمان پیاده‌سازی تأیید دستی و رسید پرداخت، به مشتری نمایش داده نمی‌شوند.</Alert.Description></Alert>
    </SettingCard>
    <SettingCard icon={<Truck size={19} />} title="ارسال و تحویل" description="قواعد محاسبه هزینه و زمان آماده‌سازی">
      <section className="grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
        <div className="flex items-start gap-2.5"><CircleDollarSign size={17} className="mt-0.5 shrink-0 text-[var(--accent)]" /><div><strong className="block text-sm">هزینه و زمان‌بندی</strong><p className="m-0 mt-1 text-xs leading-5 text-[var(--muted)]">مبالغ ارسال و زمان لازم برای آماده‌سازی سفارش</p></div></div>
        <div className="grid items-start gap-4 sm:grid-cols-2 2xl:grid-cols-3"><Field label="هزینه پایه ارسال (ریال)"><HeroNumberInput value={settings.defaultShippingFee} onValueChange={(value) => set("defaultShippingFee", Number(value))} isPrice reserveHelperSpace suffix="ریال" variant="secondary" className={adminFieldClass} /></Field><Field label="ارسال رایگان از مبلغ (ریال)"><HeroNumberInput value={settings.freeShippingThreshold ?? ""} onValueChange={(value) => set("freeShippingThreshold", value ? Number(value) : null)} isPrice reserveHelperSpace suffix="ریال" placeholder="غیرفعال" variant="secondary" className={adminFieldClass} /></Field><div className="sm:col-span-2 2xl:col-span-1"><Field label="زمان آماده‌سازی"><HeroNumberInput value={settings.preparationDays} onValueChange={(value) => set("preparationDays", Number(value))} min={0} max={90} suffix="روز" reserveHelperSpace variant="secondary" className={adminFieldClass} /></Field></div></div>
      </section>
      <section className="grid gap-3 rounded-xl border border-[var(--border)] p-4">
        <div><strong className="block text-sm">روش‌های تحویل</strong><p className="m-0 mt-1 text-xs leading-5 text-[var(--muted)]">حداقل یک روش فعال برای ثبت سفارش لازم است.</p></div>
        <div className="grid gap-3 2xl:grid-cols-2"><AdminCheckbox isSelected={settings.insuredShippingEnabled} onChange={(value) => set("insuredShippingEnabled", value)} icon={<Truck size={18} />} description="ارسال سراسری با هزینه پایه و امکان ارسال رایگان">ارسال بیمه‌شده</AdminCheckbox><AdminCheckbox isSelected={settings.inStorePickupEnabled} onChange={(value) => set("inStorePickupEnabled", value)} icon={<MapPin size={18} />} description="مشتری سفارش پرداخت‌شده را بدون هزینه ارسال از فروشگاه تحویل می‌گیرد">تحویل حضوری</AdminCheckbox></div>
      </section>
      <div className="border-t border-[var(--border)] pt-4"><AdminCheckbox isSelected={settings.calculateShippingAfterAddress} onChange={(value) => set("calculateShippingAfterAddress", value)} description="تا پیش از ورود نشانی، هزینه ارسال به‌صورت قطعی نمایش داده نشود">محاسبه ارسال پس از دریافت نشانی</AdminCheckbox></div>
    </SettingCard>
  </div><Card variant="secondary" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><strong className="block text-sm">ذخیره تنظیمات ارسال و پرداخت</strong><p className="m-0 mt-1 text-xs text-[var(--muted)]">درگاه، هزینه‌ها و روش‌های تحویل با هم ذخیره می‌شوند.</p></div><Button type="submit" variant="primary" isPending={saving} className="min-h-11 gap-2 px-5"><Save size={16} />ذخیره تنظیمات</Button></div></Card></form>;
}

const faqs = [
  ["قیمت محصولات چگونه محاسبه می‌شود؟", "محاسبه بر اساس وزن، نرخ روز طلا، اجرت، سود و مالیات"],
  ["آیا محصولات فاکتور رسمی دارند؟", "تمام سفارش‌ها همراه فاکتور رسمی فروشگاه ارسال می‌شوند"],
  ["مدت زمان ارسال سفارش چقدر است؟", "سفارش پس از آماده‌سازی با ارسال بیمه‌شده تحویل می‌شود"],
];

function ContentSettings({ onDemo }: { onDemo: (title: string) => void }) {
  return <SettingsGrid>
    <SettingCard icon={<FileQuestion size={19} />} title="سوالات متداول" description="مدیریت سوال‌ها و ترتیب نمایش در سایت" className="lg:col-span-[span_7/span_7]">
      <div className="grid gap-2">{faqs.map(([question, answer], index) => <div key={question} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3"><GripVertical size={16} className="mt-1 shrink-0 text-[var(--muted)]" /><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--surface)] text-[11px] font-black">{(index + 1).toLocaleString("fa-IR")}</span><div className="min-w-0 flex-1"><strong className="block text-sm">{question}</strong><span className="mt-1 block text-[11px] leading-5 text-[var(--muted)]">{answer}</span></div><Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`ویرایش ${question}`} onPress={() => onDemo(question)}><Settings2 size={15} /></Button></div>)}</div>
      <Button type="button" variant="secondary" onPress={() => onDemo("افزودن سوال متداول")} className="gap-2"><Plus size={16} />افزودن سوال جدید</Button>
    </SettingCard>
    <SettingCard icon={<FileText size={19} />} title="صفحات و قوانین" description="محتوای حقوقی و راهنمای خرید" className="lg:col-span-[span_5/span_5]">
      {["درباره ما", "تماس با ما", "حریم خصوصی", "شرایط استفاده", "قوانین بازگشت کالا", "شیوه ارسال و تحویل"].map((title, index) => <div key={title} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3"><span className="flex items-center gap-2 text-sm font-bold"><FileText size={15} className="text-[var(--muted)]" />{title}</span><Chip size="sm" variant="soft" className={index < 2 ? "text-emerald-700" : "text-amber-700"}><Chip.Label>{index < 2 ? "منتشرشده" : "نیازمند تکمیل"}</Chip.Label></Chip></div>)}
      <Button type="button" variant="secondary" onPress={() => onDemo("ویرایش صفحات و قوانین")} className="gap-2"><Settings2 size={16} />مدیریت صفحات</Button>
    </SettingCard>
  </SettingsGrid>;
}

function SeoSettings({ onDemo }: { onDemo: (title: string) => void }) {
  return <SettingsGrid>
    <SettingCard icon={<Search size={19} />} title="SEO فروشگاه" description="اطلاعات پیش‌فرض موتورهای جست‌وجو و شبکه‌های اجتماعی">
      <Field label="عنوان پیش‌فرض سایت"><Input defaultValue="زر گالری | خرید آنلاین طلا با قیمت روز" variant="secondary" className={adminFieldClass} /></Field><Field label="توضیحات متا"><TextArea defaultValue="خرید آنلاین زیورآلات طلای ۱۸ عیار با قیمت لحظه‌ای، تضمین اصالت و فاکتور رسمی." rows={3} variant="secondary" className={adminFieldClass} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="دامنه اصلی"><Input defaultValue="https://zargallery.ir" dir="ltr" variant="secondary" className={adminFieldClass} /></Field><Field label="نشانی Sitemap"><Input defaultValue="/sitemap.xml" dir="ltr" variant="secondary" className={adminFieldClass} /></Field></div>
      <AdminCheckbox defaultSelected description="صفحات منتشرشده امکان ایندکس‌شدن داشته باشند">اجازه ایندکس موتورهای جست‌وجو</AdminCheckbox><AdminCheckbox defaultSelected description="اطلاعات محصول، قیمت و موجودی برای موتور جست‌وجو">Structured Data محصولات</AdminCheckbox>
    </SettingCard>
    <SettingCard icon={<Bell size={19} />} title="اعلان‌ها و پیام‌ها" description="رویدادهایی که برای مدیر یا مشتری پیام ارسال می‌کنند">
      <MethodRow icon={<Mail size={18} />} title="سفارش جدید" description="ایمیل برای مدیر فروشگاه" active /><MethodRow icon={<Smartphone size={18} />} title="تأیید سفارش مشتری" description="پیامک پس از پرداخت موفق" active /><MethodRow icon={<Boxes size={18} />} title="هشدار موجودی کم" description="اعلان به مدیر کاتالوگ" active /><MethodRow icon={<Clock3 size={18} />} title="یادآوری پرداخت" description="پیش از منقضی‌شدن سفارش" active /><MethodRow icon={<Megaphone size={18} />} title="سبد خرید رهاشده" description="ارسال خودکار یادآوری به مشتری" />
      <Field label="ایمیل دریافت اعلان‌های مدیریتی"><Input defaultValue="admin@zargallery.ir" dir="ltr" variant="secondary" className={adminFieldClass} /></Field>
      <DemoFooter onPress={() => onDemo("SEO و اعلان‌ها")} />
    </SettingCard>
  </SettingsGrid>;
}

function SettingsGrid({ children }: { children: ReactNode }) { return <div className="grid gap-5 lg:grid-cols-2">{children}</div>; }

function SettingCard({ icon, title, description, children, className = "" }: { icon: ReactNode; title: string; description: string; children: ReactNode; className?: string }) {
  return <Card variant="secondary" className={`overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm ${className}`}><Card.Header className="flex-row items-center gap-3 border-b border-[var(--border)] p-5"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">{icon}</span><div><Card.Title className="text-base font-black">{title}</Card.Title><Card.Description className="mt-1 text-xs text-[var(--muted)]">{description}</Card.Description></div></Card.Header><Card.Content className="grid gap-4 p-5">{children}</Card.Content></Card>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <div className={adminLabelClass}><Label className="text-xs font-bold text-[var(--muted)]">{label}</Label>{children}</div>; }

function DemoFooter({ onPress }: { onPress: () => void }) { return <div className="flex justify-end border-t border-[var(--border)] pt-4"><Button type="button" variant="primary" onPress={onPress} className="gap-2"><Save size={16} />ذخیره تنظیمات</Button></div>; }

function MethodRow({ icon, title, description, active = false }: { icon: ReactNode; title: string; description: string; active?: boolean }) { return <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--surface)] text-[var(--muted)]">{icon}</span><div className="min-w-0 flex-1"><strong className="block text-sm">{title}</strong><span className="mt-0.5 block text-[11px] text-[var(--muted)]">{description}</span></div><Chip size="sm" variant="soft" className={active ? "text-emerald-700" : "text-slate-500"}><Chip.Label>{active ? "فعال" : "غیرفعال"}</Chip.Label></Chip></div>; }
