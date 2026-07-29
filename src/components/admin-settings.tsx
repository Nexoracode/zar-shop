"use client";

import { useState, type ReactNode } from "react";
import { Alert, Button, Card, Chip, Input, Label, Tabs, TextArea, toast } from "@heroui/react";
import {
  Bell, Boxes, CheckCircle2, ChevronDown, CircleDollarSign, Clock3, CreditCard, FileQuestion, FileText,
  Globe2, GripVertical, Images, LayoutDashboard, Mail, MapPin, Megaphone, PackageCheck, Palette, Plus, Save,
  Search, Settings2, ShieldCheck, Smartphone, Sparkles, Store, Truck, Upload, Users,
} from "lucide-react";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { HeroSelectField } from "@/components/hero-select-field";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";

const tabClass = "min-h-11 min-w-0 gap-2 whitespace-nowrap rounded-xl px-2 text-xs font-bold sm:px-3";

export function AdminSettings({ initialIndustry }: { initialIndustry: "GOLD" | "GENERAL" }) {
  const [industry, setIndustry] = useState(initialIndustry);
  const [savingIndustry, setSavingIndustry] = useState(false);
  const demoAction = (title: string) => toast.info("نسخه نمایشی تنظیمات", { description: `بخش «${title}» پس از تأیید شما به API و دیتابیس متصل می‌شود.` });

  async function saveIndustry() {
    setSavingIndustry(true);
    try {
      const response = await fetch("/api/admin/settings/store-industry", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ industry }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره صنف فروشگاه انجام نشد.");
      toast.success("صنف فروشگاه ذخیره شد", { description: industry === "GOLD" ? "محصولات جدید با قیمت روز طلا ثبت می‌شوند." : "محصولات جدید با قیمت مستقیم ثبت می‌شوند." });
    } catch (reason) {
      toast.danger("ذخیره صنف فروشگاه انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSavingIndustry(false);
    }
  }

  return (
    <div className="grid gap-5">
      <Alert status="accent" className="rounded-xl border border-blue-200 bg-blue-50 text-blue-900">
        <Alert.Description>تنظیم «صنف فروشگاه» فعال و متصل است. سایر بخش‌های این صفحه فعلاً نمونه رابط کاربری هستند و ذخیره نمی‌شوند.</Alert.Description>
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

        <Tabs.Panel id="general"><GeneralSettings industry={industry} savingIndustry={savingIndustry} onIndustryChange={setIndustry} onSaveIndustry={saveIndustry} onDemo={demoAction} /></Tabs.Panel>
        <Tabs.Panel id="homepage"><HomepageSettings onDemo={demoAction} /></Tabs.Panel>
        <Tabs.Panel id="branding"><BrandSettings onDemo={demoAction} /></Tabs.Panel>
        <Tabs.Panel id="orders"><OrderSettings onDemo={demoAction} /></Tabs.Panel>
        <Tabs.Panel id="catalog"><CatalogSettings /></Tabs.Panel>
        <Tabs.Panel id="commerce"><CommerceSettings onDemo={demoAction} /></Tabs.Panel>
        <Tabs.Panel id="content"><ContentSettings onDemo={demoAction} /></Tabs.Panel>
        <Tabs.Panel id="seo"><SeoSettings onDemo={demoAction} /></Tabs.Panel>
      </Tabs>
    </div>
  );
}

function GeneralSettings({ industry, savingIndustry, onIndustryChange, onSaveIndustry, onDemo }: { industry: "GOLD" | "GENERAL"; savingIndustry: boolean; onIndustryChange: (value: "GOLD" | "GENERAL") => void; onSaveIndustry: () => void; onDemo: (title: string) => void }) {
  return <SettingsGrid>
    <SettingCard icon={<Boxes size={19} />} title="صنف فروشگاه" description="نوع اطلاعات و روش قیمت‌گذاری محصولات را تعیین می‌کند" className="lg:col-span-2">
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-stretch sm:justify-start">
        <Button type="button" variant={industry === "GOLD" ? "primary" : "secondary"} onPress={() => onIndustryChange("GOLD")} className="h-auto min-h-24 w-full justify-start gap-3 p-4 text-right sm:w-80"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><Sparkles size={20} /></span><span><strong className="block text-sm">طلا و جواهر</strong><small className="mt-1 block opacity-75">قیمت روز طلا، وزن، عیار، اجرت، سود و مالیات</small></span></Button>
        <Button type="button" variant={industry === "GENERAL" ? "primary" : "secondary"} onPress={() => onIndustryChange("GENERAL")} className="h-auto min-h-24 w-full justify-start gap-3 p-4 text-right sm:w-80"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700"><Store size={20} /></span><span><strong className="block text-sm">فروشگاه محصولات معمولی</strong><small className="mt-1 block opacity-75">قیمت مستقیم محصول و قیمت مستقل برای هر تنوع</small></span></Button>
      </div>
      <Alert status="warning"><Alert.Description>این انتخاب روی فرم محصولات جدید اثر می‌گذارد. روش قیمت‌گذاری محصولات قبلی برای حفظ سفارش‌ها و فاکتورها تغییر نمی‌کند.</Alert.Description></Alert>
      <div className="flex justify-end border-t border-[var(--border)] pt-4"><Button type="button" variant="primary" isPending={savingIndustry} onPress={onSaveIndustry} className="gap-2"><Save size={16} />ذخیره صنف فروشگاه</Button></div>
    </SettingCard>
    <SettingCard icon={<Store size={19} />} title="هویت فروشگاه" description="اطلاعات اصلی نمایش‌داده‌شده در سایت و فاکتور">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="نام فروشگاه"><Input defaultValue="زر گالری" variant="secondary" className={adminFieldClass} /></Field><Field label="شعار کوتاه"><Input defaultValue="طلا، روایت ماندگار شما" variant="secondary" className={adminFieldClass} /></Field></div>
      <Field label="توضیح کوتاه فروشگاه"><TextArea defaultValue="فروش آنلاین زیورآلات طلای ۱۸ عیار با قیمت روز و فاکتور رسمی" rows={3} variant="secondary" className={adminFieldClass} /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><HeroSelectField name="store-currency" label="واحد پول" defaultValue="IRR" includeEmptyOption={false} options={[{ value: "IRR", label: "ریال" }, { value: "IRT", label: "تومان" }]} /><HeroSelectField name="store-timezone" label="منطقه زمانی" defaultValue="Asia/Tehran" includeEmptyOption={false} options={[{ value: "Asia/Tehran", label: "تهران (UTC+3:30)" }]} /></div>
    </SettingCard>
    <SettingCard icon={<MapPin size={19} />} title="اطلاعات تماس و حقوقی" description="برای فوتر، فاکتور و صفحات اعتماد">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="شماره تماس"><Input defaultValue="۰۲۱-۰۰۰۰۰۰۰۰" dir="ltr" variant="secondary" className={adminFieldClass} /></Field><Field label="ایمیل پشتیبانی"><Input defaultValue="support@zargallery.ir" dir="ltr" variant="secondary" className={adminFieldClass} /></Field></div>
      <Field label="نشانی فروشگاه"><TextArea placeholder="نشانی کامل فروشگاه" rows={2} variant="secondary" className={adminFieldClass} /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="شناسه ملی / کد اقتصادی"><Input placeholder="برای فاکتور رسمی" variant="secondary" className={adminFieldClass} /></Field><Field label="ساعات پاسخ‌گویی"><Input defaultValue="شنبه تا پنجشنبه، ۹ تا ۱۸" variant="secondary" className={adminFieldClass} /></Field></div>
    </SettingCard>
    <SettingCard icon={<Settings2 size={19} />} title="وضعیت و دسترسی فروشگاه" description="کنترل نمایش عمومی و تجربه حساب کاربری" className="lg:col-span-2">
      <div className="grid gap-3 md:grid-cols-3"><AdminCheckbox defaultSelected icon={<Globe2 size={17} />} description="فروشگاه برای کاربران قابل مشاهده باشد">فروشگاه فعال</AdminCheckbox><AdminCheckbox defaultSelected icon={<Users size={17} />} description="خرید بدون ساخت حساب امکان‌پذیر باشد">خرید مهمان</AdminCheckbox><AdminCheckbox icon={<ShieldCheck size={17} />} description="نمایش صفحه در حال بروزرسانی به بازدیدکنندگان">حالت تعمیر و نگهداری</AdminCheckbox></div>
      <DemoFooter onPress={() => onDemo("تنظیمات عمومی")} />
    </SettingCard>
  </SettingsGrid>;
}

const homeSections = [
  ["اسلایدر اصلی", "بنر، عنوان، توضیح و دکمه اقدام", "فعال"], ["دسته‌بندی‌های منتخب", "نمایش ۶ دسته‌بندی اصلی", "فعال"],
  ["محصولات ویژه", "محصولات علامت‌گذاری‌شده توسط مدیر", "فعال"], ["مزیت‌های خرید", "ضمانت اصالت، ارسال امن و فاکتور رسمی", "فعال"],
  ["محصولات جدید", "آخرین محصولات منتشرشده", "فعال"], ["سوالات متداول", "۶ سوال منتخب در انتهای صفحه", "غیرفعال"],
];

function HomepageSettings({ onDemo }: { onDemo: (title: string) => void }) {
  return <SettingsGrid>
    <SettingCard icon={<LayoutDashboard size={19} />} title="چینش صفحه اصلی" description="ترتیب نمایش بخش‌ها؛ دستگیره‌ها برای جابه‌جایی در نسخه نهایی" className="lg:col-span-[span_7/span_7]">
      <div className="grid gap-2">{homeSections.map(([title, description, status], index) => <div key={title} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3"><GripVertical size={17} className="shrink-0 cursor-grab text-[var(--muted)]" /><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--surface)] text-xs font-black text-[var(--muted)]">{(index + 1).toLocaleString("fa-IR")}</span><div className="min-w-0 flex-1"><strong className="block text-sm">{title}</strong><span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">{description}</span></div><Chip size="sm" variant="soft" className={status === "فعال" ? "text-emerald-700" : "text-slate-500"}><Chip.Label>{status}</Chip.Label></Chip><Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`نمایش تنظیمات ${title}`} onPress={() => onDemo(title)}><ChevronDown size={15} /></Button></div>)}</div>
      <Button type="button" variant="secondary" onPress={() => onDemo("افزودن بخش صفحه اصلی")} className="min-h-11 gap-2 border-2 border-dashed border-[var(--border)]"><Plus size={16} />افزودن بخش جدید</Button>
    </SettingCard>
    <SettingCard icon={<Images size={19} />} title="اسلایدر اصلی" description="نمونه تنظیمات بخش انتخاب‌شده" className="lg:col-span-[span_5/span_5]">
      <Field label="عنوان اصلی"><Input defaultValue="درخشش ماندگار، انتخابی مطمئن" variant="secondary" className={adminFieldClass} /></Field><Field label="متن کوتاه"><TextArea defaultValue="جدیدترین زیورآلات طلا با قیمت لحظه‌ای" rows={3} variant="secondary" className={adminFieldClass} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="متن دکمه"><Input defaultValue="مشاهده محصولات" variant="secondary" className={adminFieldClass} /></Field><Field label="لینک دکمه"><Input defaultValue="/products" dir="ltr" variant="secondary" className={adminFieldClass} /></Field></div><Button type="button" variant="secondary" onPress={() => onDemo("تصویر اسلایدر")} className="gap-2"><Upload size={16} />انتخاب تصویر دسکتاپ و موبایل</Button>
      <DemoFooter onPress={() => onDemo("چینش صفحه اصلی")} />
    </SettingCard>
  </SettingsGrid>;
}

function BrandSettings({ onDemo }: { onDemo: (title: string) => void }) {
  return <SettingsGrid>
    <SettingCard icon={<Palette size={19} />} title="رنگ‌های برند" description="رنگ‌های اصلی رابط فروشگاه">
      <div className="grid gap-3 sm:grid-cols-2"><ColorFieldPreview label="رنگ اصلی" value="#172B4D" /><ColorFieldPreview label="رنگ طلایی" value="#B5904C" /><ColorFieldPreview label="پس‌زمینه" value="#F7F6F3" /><ColorFieldPreview label="رنگ خطر" value="#D31736" /></div>
      <AdminCheckbox defaultSelected description="کنتراست متن و پس‌زمینه پیش از ذخیره بررسی شود">کنترل خودکار دسترس‌پذیری رنگ</AdminCheckbox>
    </SettingCard>
    <SettingCard icon={<Sparkles size={19} />} title="لوگو و هویت تصویری" description="دارایی‌های اصلی برند در سایت و شبکه‌های اجتماعی">
      <AssetRow title="لوگوی اصلی" hint="SVG یا PNG شفاف، حداقل عرض ۴۰۰ پیکسل" /><AssetRow title="لوگوی نسخه تیره" hint="برای فوتر و پس‌زمینه‌های تیره" /><AssetRow title="Favicon" hint="PNG یا ICO مربع، حداقل ۵۱۲×۵۱۲" /><AssetRow title="تصویر اشتراک‌گذاری" hint="برای شبکه‌های اجتماعی، ۱۲۰۰×۶۳۰" />
    </SettingCard>
    <SettingCard icon={<Smartphone size={19} />} title="قواعد نمایش" description="ظاهر مشترک صفحات محصول و فهرست" className="lg:col-span-2">
      <div className="grid gap-3 md:grid-cols-3"><AdminCheckbox defaultSelected description="هدر هنگام اسکرول در دسترس بماند">هدر چسبان</AdminCheckbox><AdminCheckbox defaultSelected description="محصولات در موبایل دو ستونه باشند">گرید فشرده موبایل</AdminCheckbox><AdminCheckbox defaultSelected description="قیمت و موجودی بدون رفرش بروزرسانی شوند">بروزرسانی زنده قیمت</AdminCheckbox></div><DemoFooter onPress={() => onDemo("ظاهر و برند")} />
    </SettingCard>
  </SettingsGrid>;
}

function OrderSettings({ onDemo }: { onDemo: (title: string) => void }) {
  return <SettingsGrid>
    <SettingCard icon={<Clock3 size={19} />} title="انقضای سفارش‌های بدون اقدام" description="مانند فروشگاه‌های بزرگ، سفارش پرداخت‌نشده پس از مهلت تعیین‌شده منقضی می‌شود" className="lg:col-span-2">
      <div className="grid gap-5 lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.3fr)]">
        <div className="grid content-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <span className="grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-700"><Clock3 size={21} /></span>
          <div><span className="text-xs text-amber-700">مهلت فعلی پرداخت</span><strong className="mt-1 block text-2xl font-black">۱۵ دقیقه</strong></div>
          <p className="m-0 text-xs leading-6 text-amber-800">اگر مشتری در این زمان پرداخت را کامل نکند، سفارش منقضی و موجودی رزروشده دوباره قابل فروش می‌شود.</p>
          <Chip size="sm" variant="soft" className="w-fit text-amber-800"><Chip.Label>فقط سفارش‌های در انتظار پرداخت</Chip.Label></Chip>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2"><Field label="زمان انقضا (دقیقه)"><Input type="number" defaultValue="15" min={1} max={1440} variant="secondary" className={adminFieldClass} /></Field><Field label="هشدار قبل از انقضا (دقیقه)"><Input type="number" defaultValue="5" min={0} variant="secondary" className={adminFieldClass} /></Field></div>
          <div className="grid gap-4 sm:grid-cols-2"><HeroSelectField name="order-expiration-start" label="شروع شمارش زمان از" defaultValue="CREATED_AT" includeEmptyOption={false} options={[{ value: "CREATED_AT", label: "زمان ایجاد سفارش" }, { value: "PAYMENT_STARTED_AT", label: "زمان ورود به درگاه" }]} /><HeroSelectField name="order-expiration-action" label="اقدام پس از پایان مهلت" defaultValue="EXPIRE" includeEmptyOption={false} options={[{ value: "EXPIRE", label: "منقضی‌کردن خودکار سفارش" }, { value: "CANCEL", label: "لغو خودکار سفارش" }, { value: "NOTIFY", label: "فقط ارسال هشدار به مدیر" }]} /></div>
          <AdminCheckbox defaultSelected description="شمارش معکوس مهلت پرداخت در صفحه سفارش و پرداخت دیده شود">نمایش شمارش معکوس به مشتری</AdminCheckbox>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3"><AdminCheckbox defaultSelected description="پس از پایان زمان، وضعیت سفارش به منقضی‌شده تغییر کند">انقضای خودکار سفارش</AdminCheckbox><AdminCheckbox defaultSelected description="موجودی محصول و تنوع‌ها دوباره آزاد شود">آزادسازی موجودی رزروشده</AdminCheckbox><AdminCheckbox defaultSelected description="کد تخفیف مصرف‌شده دوباره قابل استفاده شود">بازگرداندن ظرفیت کد تخفیف</AdminCheckbox></div>
      <Alert status="warning"><Alert.Description>در پیاده‌سازی نهایی، پرداخت موفق هم‌زمان با انقضا باید اولویت داشته باشد و لغو سفارش، آزادسازی موجودی و callback پرداخت به‌صورت اتمیک و idempotent اجرا شوند.</Alert.Description></Alert>
      <DemoFooter onPress={() => onDemo("انقضای سفارش‌های بدون اقدام")} />
    </SettingCard>
    <SettingCard icon={<PackageCheck size={19} />} title="قواعد ثبت سفارش" description="محدودیت‌ها و شماره‌گذاری سفارش">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="حداقل مبلغ سفارش (ریال)"><Input type="number" defaultValue="5000000" dir="ltr" variant="secondary" className={adminFieldClass} /></Field><Field label="پیشوند شماره سفارش"><Input defaultValue="ZG" dir="ltr" variant="secondary" className={adminFieldClass} /></Field></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="حداکثر تعداد هر قلم"><Input type="number" defaultValue="5" variant="secondary" className={adminFieldClass} /></Field><HeroSelectField name="order-default-status" label="وضعیت اولیه" defaultValue="PENDING" includeEmptyOption={false} options={[{ value: "PENDING", label: "در انتظار پرداخت" }, { value: "PROCESSING", label: "در حال پردازش" }]} /></div>
      <AdminCheckbox defaultSelected description="پیش از پرداخت، نرخ و مبلغ سفارش سمت سرور دوباره کنترل شود">بازبینی نرخ طلا هنگام پرداخت</AdminCheckbox>
      <DemoFooter onPress={() => onDemo("سفارش و سبد خرید")} />
    </SettingCard>
  </SettingsGrid>;
}

function CatalogSettings() {
  return <SettingsGrid>
    <SettingCard icon={<Boxes size={19} />} title="موجودی و کاتالوگ" description="قواعد عمومی محصولات و تنوع‌ها">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="آستانه هشدار موجودی کم"><Input type="number" defaultValue="3" min={0} variant="secondary" className={adminFieldClass} /></Field><Field label="تعداد محصولات هر صفحه"><Input type="number" defaultValue="24" min={1} variant="secondary" className={adminFieldClass} /></Field></div>
      <AdminCheckbox defaultSelected description="محصول بدون موجودی در نتایج فروشگاه نمایش داده نشود">مخفی‌کردن محصولات ناموجود</AdminCheckbox><AdminCheckbox defaultSelected description="نمایش امتیاز و دیدگاه تأییدشده در صفحه محصول">دیدگاه و امتیاز مشتریان</AdminCheckbox><AdminCheckbox description="اجازه ثبت سفارش بیشتر از موجودی فعلی">پیش‌فروش / Backorder</AdminCheckbox>
    </SettingCard>
    <SettingCard icon={<CircleDollarSign size={19} />} title="نرخ طلا و قیمت‌گذاری" description="رفتار نرخ لحظه‌ای و وضعیت منبع قیمت">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="فاصله بروزرسانی نرخ (ثانیه)"><Input type="number" defaultValue="60" min={10} variant="secondary" className={adminFieldClass} /></Field><Field label="حداکثر عمر نرخ جایگزین (دقیقه)"><Input type="number" defaultValue="15" min={1} variant="secondary" className={adminFieldClass} /></Field></div>
      <HeroSelectField name="gold-source" label="منبع نرخ اصلی" defaultValue="primary" includeEmptyOption={false} options={[{ value: "primary", label: "سرویس نرخ طلای اصلی" }, { value: "manual", label: "نرخ دستی اضطراری" }]} />
      <AdminCheckbox defaultSelected description="اگر نرخ معتبر در دسترس نبود، امکان ثبت سفارش متوقف شود">توقف فروش هنگام نامعتبر بودن نرخ</AdminCheckbox><AdminCheckbox defaultSelected description="نرخ، وزن، اجرت، سود و مالیات در سفارش ثابت بماند">Snapshot کامل اجزای قیمت</AdminCheckbox>
      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><span className="flex items-center gap-2 font-bold"><CheckCircle2 size={16} />منبع نرخ اصلی متصل است</span><Chip size="sm" variant="soft"><Chip.Label>نمونه نمایشی</Chip.Label></Chip></div>
    </SettingCard>
  </SettingsGrid>;
}

function CommerceSettings({ onDemo }: { onDemo: (title: string) => void }) {
  return <SettingsGrid>
    <SettingCard icon={<CreditCard size={19} />} title="روش‌های پرداخت" description="درگاه‌ها و ترتیب نمایش در تسویه حساب">
      <MethodRow icon={<CreditCard size={18} />} title="درگاه پرداخت آنلاین" description="روش اصلی پرداخت سفارش" active /><MethodRow icon={<CircleDollarSign size={18} />} title="پرداخت کارت‌به‌کارت" description="نیازمند تأیید دستی اپراتور" /><MethodRow icon={<Store size={18} />} title="پرداخت حضوری" description="ویژه تحویل از فروشگاه" />
      <Button type="button" variant="secondary" onPress={() => onDemo("افزودن درگاه پرداخت")} className="gap-2"><Plus size={16} />افزودن درگاه</Button>
    </SettingCard>
    <SettingCard icon={<Truck size={19} />} title="ارسال و تحویل" description="قواعد محاسبه هزینه و زمان آماده‌سازی">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="ارسال رایگان از مبلغ (ریال)"><Input type="number" defaultValue="100000000" dir="ltr" variant="secondary" className={adminFieldClass} /></Field><Field label="زمان آماده‌سازی (روز کاری)"><Input type="number" defaultValue="2" min={0} variant="secondary" className={adminFieldClass} /></Field></div>
      <MethodRow icon={<Truck size={18} />} title="ارسال بیمه‌شده" description="ارسال سراسری با محاسبه هزینه" active /><MethodRow icon={<MapPin size={18} />} title="تحویل حضوری" description="انتخاب شعبه و بازه مراجعه" active />
      <AdminCheckbox defaultSelected description="تا پیش از ورود نشانی، هزینه ارسال نمایش داده نشود">محاسبه ارسال پس از دریافت نشانی</AdminCheckbox>
      <DemoFooter onPress={() => onDemo("ارسال و پرداخت")} />
    </SettingCard>
  </SettingsGrid>;
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

function ColorFieldPreview({ label, value }: { label: string; value: string }) { return <Field label={label}><div className="flex items-center gap-2"><span className="size-11 shrink-0 rounded-xl border border-[var(--border)] shadow-sm" style={{ backgroundColor: value }} /><Input defaultValue={value} dir="ltr" variant="secondary" className={adminFieldClass} /></div></Field>; }

function AssetRow({ title, hint }: { title: string; hint: string }) { return <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--surface)] text-[var(--muted)]"><Images size={18} /></span><div className="min-w-0 flex-1"><strong className="block text-sm">{title}</strong><span className="mt-0.5 block text-[11px] text-[var(--muted)]">{hint}</span></div><Button type="button" size="sm" variant="secondary" className="gap-1.5"><Upload size={14} />انتخاب فایل</Button></div>; }

function MethodRow({ icon, title, description, active = false }: { icon: ReactNode; title: string; description: string; active?: boolean }) { return <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--surface)] text-[var(--muted)]">{icon}</span><div className="min-w-0 flex-1"><strong className="block text-sm">{title}</strong><span className="mt-0.5 block text-[11px] text-[var(--muted)]">{description}</span></div><Chip size="sm" variant="soft" className={active ? "text-emerald-700" : "text-slate-500"}><Chip.Label>{active ? "فعال" : "غیرفعال"}</Chip.Label></Chip></div>; }
