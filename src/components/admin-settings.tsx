"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { Alert, Button, Card, Chip, Input, Label, TextArea, buttonVariants, toast } from "@heroui/react";
import {
  Bell, Boxes, CheckCircle2, CircleDollarSign, Clock3, CreditCard, Eye, EyeOff, FileQuestion, FileText,
  Globe2, GripVertical, Images, LayoutDashboard, Mail, MapPin, Megaphone, PackageCheck, Palette, Plus, Save,
  Search, Settings2, ShieldCheck, Smartphone, Sparkles, Store, Trash2, Truck, Upload, Users, ListTree,
} from "lucide-react";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { HeroSelectField } from "@/components/hero-select-field";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { HeroNumberInput } from "@/components/hero-number-input";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { MediaChoice } from "@/components/media-library";
import type { GeneralStoreSettingsInput } from "@/modules/settings/general-settings";
import type { HomepageMenuCategoryOption, HomepageSectionId, HomepageSettings as HomepageSettingsData } from "@/modules/settings/homepage-settings";
import type { BrandSettings as BrandSettingsData } from "@/modules/settings/brand-settings";
import type { OrderSettings as OrderSettingsData } from "@/modules/settings/order-settings";
import type { CommerceSettings as CommerceSettingsData } from "@/modules/settings/commerce-settings";
import type { ContentPageId, ContentSettings as ContentSettingsData } from "@/modules/settings/content-settings";
import type { CatalogSettings as CatalogSettingsData } from "@/modules/settings/catalog-settings";
import { RichTextEditor } from "@/components/rich-text-editor";

export function GeneralSettings({ initialSettings }: { initialSettings: GeneralStoreSettingsInput }) {
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
    </SettingCard>
  </SettingsGrid><Card variant="secondary" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><strong className="block text-sm">ذخیره تنظیمات عمومی</strong><p className="m-0 mt-1 text-xs text-[var(--muted)]">اطلاعات و وضعیت عمومی فروشگاه با هم ذخیره می‌شوند.</p></div><Button type="submit" variant="primary" isPending={saving} className="min-h-11 gap-2 px-5"><Save size={16} />ذخیره تنظیمات</Button></div></Card></form>;
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

export function HomepageSettings({ initialSettings, menuCategories }: { initialSettings: HomepageSettingsData; menuCategories: HomepageMenuCategoryOption[] }) {
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState(initialSettings.sections);
  const [menuCategoryIds, setMenuCategoryIds] = useState(initialSettings.menuCategoryIds);
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
        body: JSON.stringify({ ...values, sections, menuCategoryIds, heroContentMode, heroTitle, heroDescription, heroButtonLabel, heroDesktopMediaId: desktopMedia?.id ?? null, heroMobileMediaId: mobileMedia?.id ?? null, promoBannerEnabled, promoDesktopMediaId: promoDesktopMedia?.id ?? null, promoMobileMediaId: promoMobileMedia?.id ?? null }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره تنظیمات صفحه اصلی انجام نشد.");
      toast.success("تنظیمات صفحه اصلی ذخیره شد", { description: "چینش، منوی بالا، اسلایدر و تصاویر در سایت اعمال شدند." });
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
      <SettingCard icon={<ListTree size={19} />} title="منوی بالا و مگامنو" description="دسته‌های سطح اولی که در نوار اصلی و مگامنو نمایش داده می‌شوند" className="lg:col-span-2">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3">
          <div><strong className="block text-xs">دسته‌های قابل نمایش</strong><span className="mt-1 block text-[11px] text-[var(--muted)]">حداکثر ۶ دسته را انتخاب کنید؛ زیر‌دسته‌های هر مورد داخل مگامنو نمایش داده می‌شوند.</span></div>
          <Chip size="sm" variant="soft" className="shrink-0 text-[var(--accent)]"><Chip.Label>{menuCategoryIds.length.toLocaleString("fa-IR")} از ۶</Chip.Label></Chip>
        </div>
        {menuCategories.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{menuCategories.map((category) => {
          const selected = menuCategoryIds.includes(category.id);
          const disabled = !selected && menuCategoryIds.length >= 6;
          return <Button
            key={category.id}
            type="button"
            variant="secondary"
            isDisabled={disabled}
            aria-pressed={selected}
            onPress={() => setMenuCategoryIds((current) => selected ? current.filter((id) => id !== category.id) : [...current, category.id])}
            className={`h-auto min-h-16 w-full justify-start rounded-xl border p-3 text-right transition ${selected ? "border-[var(--accent)] bg-[var(--accent)]/8 text-[var(--accent)] ring-1 ring-[var(--accent)]/20" : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--accent)]/40"}`}
          >
            <span className="flex w-full items-center gap-3"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${selected ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "bg-[var(--surface-secondary)] text-[var(--muted)]"}`}>{selected ? <CheckCircle2 size={16} /> : <Boxes size={16} />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{category.name}</strong><small className="mt-1 block text-[10px] opacity-70">{category.childrenCount.toLocaleString("fa-IR")} زیردسته فعال</small></span></span>
          </Button>;
        })}</div> : <Alert status="warning"><Alert.Description>دسته فعال سطح اولی برای انتخاب وجود ندارد. ابتدا از بخش دسته‌بندی‌ها یک دسته فعال بسازید.</Alert.Description></Alert>}
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
          <div><strong className="block text-sm">ذخیره تغییرات صفحه اصلی</strong><p className="m-0 mt-1 text-xs text-[var(--muted)]">چینش بخش‌ها، منوی بالا، اسلایدر، تصاویر و پروموبنر با هم ذخیره می‌شوند.</p></div>
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

export function BrandSettings({ initialSettings }: { initialSettings: BrandSettingsData }) {
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

export function OrderSettings({ initialSettings }: { initialSettings: OrderSettingsData }) {
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

export function CatalogSettings({ initialSettings }: { initialSettings: CatalogSettingsData }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const isGold = settings.industry === "GOLD";
  const set = <Key extends keyof CatalogSettingsData>(key: Key, value: CatalogSettingsData[Key]) => setSettings((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const common = {
        catalogLowStockThreshold: settings.catalogLowStockThreshold,
        catalogPageSize: settings.catalogPageSize,
        hideOutOfStockProducts: settings.hideOutOfStockProducts,
        showProductStock: settings.showProductStock,
      };
      const payload = isGold ? {
        ...common,
        goldPriceRefreshSeconds: settings.goldPriceRefreshSeconds,
        goldPriceCacheSeconds: settings.goldPriceCacheSeconds,
        goldPriceFallbackMinutes: settings.goldPriceFallbackMinutes,
      } : common;
      const response = await fetch("/api/admin/settings/catalog", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره تنظیمات محصولات انجام نشد.");
      setSettings(result as CatalogSettingsData);
      toast.success(isGold ? "تنظیمات محصول و قیمت طلا ذخیره شد" : "تنظیمات محصولات ذخیره شد", { description: "تغییرات روی فروشگاه و هشدارهای موجودی اعمال شدند." });
    } catch (reason) {
      toast.danger("ذخیره تنظیمات محصولات انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally { setSaving(false); }
  }

  return <form onSubmit={submit} className="grid gap-5"><SettingsGrid>
    <SettingCard icon={<Boxes size={19} />} title="موجودی و نمایش محصولات" description="قواعد نمایش کاتالوگ و هشدارهای مدیریت موجودی">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="آستانه هشدار موجودی کم"><HeroNumberInput value={settings.catalogLowStockThreshold} onValueChange={(value) => set("catalogLowStockThreshold", Number(value))} min={0} max={10000} variant="secondary" className={adminFieldClass} /></Field><Field label="تعداد محصولات هر صفحه"><HeroNumberInput value={settings.catalogPageSize} onValueChange={(value) => set("catalogPageSize", Number(value))} min={4} max={100} variant="secondary" className={adminFieldClass} /></Field></div>
      <div className="grid gap-3 sm:grid-cols-2"><AdminCheckbox isSelected={settings.hideOutOfStockProducts} onChange={(value) => set("hideOutOfStockProducts", value)} description="محصول بدون موجودی در فهرست و نتایج فروشگاه نمایش داده نشود">مخفی‌کردن محصولات ناموجود</AdminCheckbox><AdminCheckbox isSelected={settings.showProductStock} onChange={(value) => set("showProductStock", value)} description="تعداد دقیق موجودی در مشخصات صفحه محصول نمایش داده شود">نمایش تعداد دقیق موجودی</AdminCheckbox></div>
    </SettingCard>
    {isGold && <SettingCard icon={<CircleDollarSign size={19} />} title="نرخ طلا و قیمت‌گذاری" description="بازه بروزرسانی و نگهداری امن نرخ طلا">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="بروزرسانی نمایش نرخ (ثانیه)"><HeroNumberInput value={settings.goldPriceRefreshSeconds} onValueChange={(value) => set("goldPriceRefreshSeconds", Number(value))} min={15} max={3600} variant="secondary" className={adminFieldClass} /></Field><Field label="عمر کش نرخ (ثانیه)"><HeroNumberInput value={settings.goldPriceCacheSeconds} onValueChange={(value) => set("goldPriceCacheSeconds", Number(value))} min={15} max={3600} variant="secondary" className={adminFieldClass} /></Field></div>
      <Field label="حداکثر عمر نرخ جایگزین (دقیقه)"><HeroNumberInput value={settings.goldPriceFallbackMinutes} onValueChange={(value) => set("goldPriceFallbackMinutes", Number(value))} min={1} max={1440} variant="secondary" className={adminFieldClass} /></Field>
      <Alert status="warning"><Alert.Description>اگر نرخ معتبر اصلی یا جایگزین کنترل‌شده در دسترس نباشد، فروش متوقف می‌شود. نرخ و تمام اجزای قیمت نیز هنگام ثبت سفارش به‌صورت ثابت ذخیره می‌شوند.</Alert.Description></Alert>
    </SettingCard>}
  </SettingsGrid><Card variant="secondary" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><strong className="block text-sm">{isGold ? "ذخیره تنظیمات محصول و قیمت طلا" : "ذخیره تنظیمات محصولات"}</strong><p className="m-0 mt-1 text-xs text-[var(--muted)]">تمام تنظیمات این صفحه با هم ذخیره و بلافاصله روی فروشگاه اعمال می‌شوند.</p></div><Button type="submit" variant="primary" isPending={saving} className="min-h-11 gap-2 px-5"><Save size={16} />ذخیره تنظیمات</Button></div></Card></form>;
}

export function CommerceSettings({ initialSettings, configuredGatewayCount }: { initialSettings: CommerceSettingsData; configuredGatewayCount: number }) {
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
      <div className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${configuredGatewayCount ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><span className="flex items-center gap-2 text-sm font-bold">{configuredGatewayCount ? <CheckCircle2 size={17} /> : <CreditCard size={17} />}درگاه‌های ثبت‌شده</span><Chip size="sm" variant="soft"><Chip.Label>{configuredGatewayCount.toLocaleString("fa-IR")} درگاه</Chip.Label></Chip></div>
      <Link href="/admin/settings/payment-gateways" className={buttonVariants({ variant: "secondary", className: "min-h-11 w-full gap-2" })}><Plus size={16} />افزودن و مدیریت درگاه</Link>
      <Alert status="accent"><Alert.Description>کارت‌به‌کارت و پرداخت حضوری تا زمان پیاده‌سازی تأیید دستی و رسید پرداخت، به مشتری نمایش داده نمی‌شوند.</Alert.Description></Alert>
    </SettingCard>
    <SettingCard icon={<Truck size={19} />} title="ارسال و تحویل" description="فعال‌سازی روش‌های قابل انتخاب برای مشتری">
      <section className="grid gap-3 rounded-xl border border-[var(--border)] p-4">
        <div><strong className="block text-sm">روش‌های تحویل</strong><p className="m-0 mt-1 text-xs leading-5 text-[var(--muted)]">حداقل یک روش فعال برای ثبت سفارش لازم است.</p></div>
        <div className="grid gap-3 2xl:grid-cols-2"><AdminCheckbox isSelected={settings.insuredShippingEnabled} onChange={(value) => set("insuredShippingEnabled", value)} icon={<Truck size={18} />} description="هزینه پس از دریافت نشانی و بر اساس وزن مرسوله محاسبه می‌شود">ارسال بیمه‌شده</AdminCheckbox><AdminCheckbox isSelected={settings.inStorePickupEnabled} onChange={(value) => set("inStorePickupEnabled", value)} icon={<MapPin size={18} />} description="مشتری سفارش پرداخت‌شده را بدون هزینه ارسال از فروشگاه تحویل می‌گیرد">تحویل حضوری</AdminCheckbox></div>
      </section>
    </SettingCard>
  </div><Card variant="secondary" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><strong className="block text-sm">ذخیره تنظیمات ارسال و پرداخت</strong><p className="m-0 mt-1 text-xs text-[var(--muted)]">وضعیت درگاه و روش‌های تحویل با هم ذخیره می‌شوند.</p></div><Button type="submit" variant="primary" isPending={saving} className="min-h-11 gap-2 px-5"><Save size={16} />ذخیره تنظیمات</Button></div></Card></form>;
}

export function ContentSettings({ initialSettings }: { initialSettings: ContentSettingsData }) {
  const [faqs, setFaqs] = useState(initialSettings.faqs);
  const [pages, setPages] = useState(initialSettings.pages);
  const [selectedPageId, setSelectedPageId] = useState<ContentPageId>(initialSettings.pages[0].id);
  const [draggedFaqId, setDraggedFaqId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? pages[0];

  const updateFaq = (id: string, patch: Partial<ContentSettingsData["faqs"][number]>) => setFaqs((current) => current.map((faq) => faq.id === id ? { ...faq, ...patch } : faq));
  const updatePage = (id: ContentPageId, patch: Partial<ContentSettingsData["pages"][number]>) => setPages((current) => current.map((page) => page.id === id ? { ...page, ...patch } : page));

  function dropFaq(targetId: string) {
    if (!draggedFaqId || draggedFaqId === targetId) return setDraggedFaqId(null);
    setFaqs((current) => {
      const source = current.find((faq) => faq.id === draggedFaqId);
      if (!source) return current;
      const next = current.filter((faq) => faq.id !== draggedFaqId);
      const targetIndex = next.findIndex((faq) => faq.id === targetId);
      next.splice(targetIndex, 0, source);
      return next;
    });
    setDraggedFaqId(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (faqs.some((faq) => faq.question.trim().length < 3 || faq.answer.trim().length < 3)) {
      toast.warning("سوالات متداول کامل نیستند", { description: "برای هر سوال، متن سوال و پاسخ را کامل کنید." });
      return;
    }
    const incompletePage = pages.find((page) => page.published && !page.content.replace(/<[^>]*>/g, "").trim() && !/<(img|table|hr)\b/i.test(page.content));
    if (incompletePage) {
      setSelectedPageId(incompletePage.id);
      toast.warning("صفحه منتشرشده محتوا ندارد", { description: `محتوای «${incompletePage.title}» را کامل کنید یا آن را به پیش‌نویس برگردانید.` });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/content", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ faqs, pages }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره تنظیمات محتوا انجام نشد.");
      setFaqs(result.faqs); setPages(result.pages);
      toast.success("محتوا و سوالات متداول ذخیره شد", { description: "تغییرات صفحات منتشرشده و FAQ در سایت اعمال شدند." });
    } catch (reason) {
      toast.danger("ذخیره محتوا انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally { setSaving(false); }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <SettingsGrid>
      <SettingCard icon={<FileQuestion size={19} />} title="سوالات متداول" description="برای تغییر ترتیب، هر سوال را از دستگیره جابه‌جا کنید" className="lg:col-span-2">
        <div className="grid gap-3">{faqs.map((faq, index) => <div key={faq.id} onDragOver={(event) => event.preventDefault()} onDrop={() => dropFaq(faq.id)} className={`grid gap-3 rounded-xl border bg-[var(--surface-secondary)] p-3 transition sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] ${draggedFaqId === faq.id ? "border-[var(--accent)] opacity-50" : "border-[var(--border)]"}`}>
          <span draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", faq.id); setDraggedFaqId(faq.id); }} onDragEnd={() => setDraggedFaqId(null)} className="mt-1 shrink-0 cursor-grab active:cursor-grabbing"><Button type="button" isIconOnly size="sm" variant="ghost" className="pointer-events-none text-[var(--muted)]" aria-label={`جابه‌جایی سوال ${(index + 1).toLocaleString("fa-IR")}`}><GripVertical size={16} /></Button></span>
          <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--surface)] text-[11px] font-black">{(index + 1).toLocaleString("fa-IR")}</span>
          <div className="grid min-w-0 gap-3"><Field label="سوال"><Input value={faq.question} onChange={(event) => updateFaq(faq.id, { question: event.target.value })} variant="secondary" className={adminFieldClass} /></Field><Field label="پاسخ"><TextArea value={faq.answer} onChange={(event) => updateFaq(faq.id, { answer: event.target.value })} rows={2} variant="secondary" className={adminFieldClass} /></Field></div>
          <div className="mt-6 flex items-start gap-1 sm:flex-col"><Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`${faq.enabled ? "غیرفعال‌کردن" : "فعال‌کردن"} سوال`} onPress={() => updateFaq(faq.id, { enabled: !faq.enabled })}>{faq.enabled ? <Eye size={16} className="text-emerald-600" /> : <EyeOff size={16} className="text-[var(--muted)]" />}</Button><Button type="button" isIconOnly size="sm" variant="danger-soft" aria-label="حذف سوال" onPress={() => setFaqs((current) => current.filter((item) => item.id !== faq.id))}><Trash2 size={15} /></Button></div>
        </div>)}</div>
        <Button type="button" variant="secondary" onPress={() => setFaqs((current) => [...current, { id: crypto.randomUUID(), question: "", answer: "", enabled: true }])} className="w-fit gap-2"><Plus size={16} />افزودن سوال جدید</Button>
      </SettingCard>
      <SettingCard icon={<FileText size={19} />} title="صفحات و قوانین" description="محتوای حقوقی و راهنمای خرید" className="lg:col-span-2">
        <div className="grid items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="grid gap-2">{pages.map((page) => <Button key={page.id} type="button" variant={page.id === selectedPage.id ? "primary" : "secondary"} onPress={() => setSelectedPageId(page.id)} className="min-h-12 justify-between gap-3 px-3 text-right"><span className="flex min-w-0 items-center gap-2"><FileText size={15} className="shrink-0" /><span className="truncate">{page.title}</span></span><Chip size="sm" variant="soft" className={page.published ? "text-emerald-700" : "text-amber-700"}><Chip.Label>{page.published ? "منتشر" : "پیش‌نویس"}</Chip.Label></Chip></Button>)}</div>
          <div className="grid min-w-0 gap-4 rounded-xl border border-[var(--border)] p-4"><div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]"><Field label="عنوان صفحه"><Input value={selectedPage.title} onChange={(event) => updatePage(selectedPage.id, { title: event.target.value })} variant="secondary" className={adminFieldClass} /></Field><AdminCheckbox isSelected={selectedPage.published} onChange={(published) => updatePage(selectedPage.id, { published })} description="صفحه در سایت و فوتر قابل مشاهده باشد">انتشار صفحه</AdminCheckbox></div><div className={adminLabelClass}><Label className="text-xs font-bold text-[var(--muted)]">محتوای صفحه</Label><RichTextEditor key={selectedPage.id} value={selectedPage.content} onChange={(content) => updatePage(selectedPage.id, { content })} /></div></div>
        </div>
      </SettingCard>
    </SettingsGrid>
    <Card variant="secondary" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><strong className="block text-sm">ذخیره محتوای سایت</strong><p className="m-0 mt-1 text-xs text-[var(--muted)]">ترتیب FAQ، وضعیت انتشار و محتوای تمام صفحات با هم ذخیره می‌شوند.</p></div><Button type="submit" variant="primary" isPending={saving} className="min-h-11 gap-2 px-5"><Save size={16} />ذخیره تنظیمات محتوا</Button></div></Card>
  </form>;
}

export function SeoSettings() {
  const onDemo = () => toast.info("نسخه نمایشی تنظیمات", { description: "بخش «SEO حرفه‌ای» پس از تأیید شما به API و دیتابیس متصل می‌شود." });
  return <SettingsGrid>
    <SettingCard icon={<Search size={19} />} title="SEO حرفه‌ای" description="اطلاعات پیش‌فرض موتورهای جست‌وجو و شبکه‌های اجتماعی" className="lg:col-span-2">
      <Field label="عنوان پیش‌فرض سایت"><Input defaultValue="زر گالری | خرید آنلاین طلا با قیمت روز" variant="secondary" className={adminFieldClass} /></Field><Field label="توضیحات متا"><TextArea defaultValue="خرید آنلاین زیورآلات طلای ۱۸ عیار با قیمت لحظه‌ای، تضمین اصالت و فاکتور رسمی." rows={3} variant="secondary" className={adminFieldClass} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="دامنه اصلی"><Input defaultValue="https://zargallery.ir" dir="ltr" variant="secondary" className={adminFieldClass} /></Field><Field label="نشانی Sitemap"><Input defaultValue="/sitemap.xml" dir="ltr" variant="secondary" className={adminFieldClass} /></Field></div>
      <AdminCheckbox defaultSelected description="صفحات منتشرشده امکان ایندکس‌شدن داشته باشند">اجازه ایندکس موتورهای جست‌وجو</AdminCheckbox><AdminCheckbox defaultSelected description="اطلاعات محصول، قیمت و موجودی برای موتور جست‌وجو">Structured Data محصولات</AdminCheckbox>
      <DemoFooter onPress={onDemo} />
    </SettingCard>
  </SettingsGrid>;
}

export function NotificationSettings() {
  const onDemo = () => toast.info("نسخه نمایشی تنظیمات", { description: "بخش «اعلان و پیامک» پس از تأیید شما به API و دیتابیس متصل می‌شود." });
  return <SettingsGrid>
    <SettingCard icon={<Bell size={19} />} title="اعلان و پیامک" description="رویدادهایی که برای مدیر یا مشتری پیام ارسال می‌کنند" className="lg:col-span-2">
      <MethodRow icon={<Mail size={18} />} title="سفارش جدید" description="ایمیل برای مدیر فروشگاه" active /><MethodRow icon={<Smartphone size={18} />} title="تأیید سفارش مشتری" description="پیامک پس از پرداخت موفق" active /><MethodRow icon={<Boxes size={18} />} title="هشدار موجودی کم" description="اعلان به مدیر کاتالوگ" active /><MethodRow icon={<Clock3 size={18} />} title="یادآوری پرداخت" description="پیش از منقضی‌شدن سفارش" active /><MethodRow icon={<Megaphone size={18} />} title="سبد خرید رهاشده" description="ارسال خودکار یادآوری به مشتری" />
      <Field label="ایمیل دریافت اعلان‌های مدیریتی"><Input defaultValue="admin@zargallery.ir" dir="ltr" variant="secondary" className={adminFieldClass} /></Field>
      <DemoFooter onPress={onDemo} />
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
