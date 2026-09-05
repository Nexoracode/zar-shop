"use client";

import { useState, type FormEvent } from "react";
import { toast } from "@heroui/react";
import { AlertTriangle } from "lucide-react";
import type { CatalogSettings as CatalogSettingsData } from "@/modules/settings/catalog-settings";
import { BpButton, BpCheckbox, BpKicker, BpNumberInput } from "./ui";

function OptionCheckbox({ title, description, isSelected, onChange }: { title: string; description: string; isSelected: boolean; onChange: (value: boolean) => void }) {
  return (
    <BpCheckbox isSelected={isSelected} onChange={() => onChange(!isSelected)} className="w-full items-center gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
      <span><strong className="block text-[13px] font-bold">{title}</strong><span className="bp-muted mt-0.5 block text-[11px] leading-5">{description}</span></span>
    </BpCheckbox>
  );
}

export function BlueprintCatalogSettings({ initialSettings }: { initialSettings: CatalogSettingsData }) {
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
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>موجودی و نمایش محصولات</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">قواعد نمایش کاتالوگ و هشدارهای مدیریت موجودی</p>
        <div className="mt-3 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <BpNumberInput label="آستانه هشدار موجودی کم" value={String(settings.catalogLowStockThreshold)} onValueChange={(value) => set("catalogLowStockThreshold", Number(value || 0))} />
            <BpNumberInput label="تعداد محصولات هر صفحه" value={String(settings.catalogPageSize)} onValueChange={(value) => set("catalogPageSize", Number(value || 0))} />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <OptionCheckbox title="مخفی‌کردن محصولات ناموجود" description="محصول بدون موجودی در فهرست و نتایج فروشگاه نمایش داده نشود." isSelected={settings.hideOutOfStockProducts} onChange={(value) => set("hideOutOfStockProducts", value)} />
            <OptionCheckbox title="نمایش تعداد دقیق موجودی" description="تعداد دقیق موجودی در مشخصات صفحه محصول نمایش داده شود." isSelected={settings.showProductStock} onChange={(value) => set("showProductStock", value)} />
          </div>
        </div>
      </section>

      {isGold && (
        <section className="bp-frame relative p-[16px]">
          <BpKicker>نرخ طلا و قیمت‌گذاری</BpKicker>
          <p className="bp-muted m-0 mt-1 text-[12px] leading-6">بازه بروزرسانی و نگهداری امن نرخ طلا</p>
          <div className="mt-3 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <BpNumberInput label="بروزرسانی نمایش نرخ (ثانیه)" value={String(settings.goldPriceRefreshSeconds)} onValueChange={(value) => set("goldPriceRefreshSeconds", Number(value || 0))} />
              <BpNumberInput label="عمر کش نرخ (ثانیه)" value={String(settings.goldPriceCacheSeconds)} onValueChange={(value) => set("goldPriceCacheSeconds", Number(value || 0))} />
            </div>
            <BpNumberInput label="حداکثر عمر نرخ جایگزین (دقیقه)" value={String(settings.goldPriceFallbackMinutes)} onValueChange={(value) => set("goldPriceFallbackMinutes", Number(value || 0))} />
            <div className="flex items-start gap-2.5 border border-[var(--bp-warning)] bg-[var(--bp-warning-bg)] p-3 text-[var(--bp-warning)]">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <p className="m-0 text-[12px] leading-6">اگر نرخ معتبر اصلی یا جایگزین کنترل‌شده در دسترس نباشد، فروش متوقف می‌شود. نرخ و تمام اجزای قیمت نیز هنگام ثبت سفارش به‌صورت ثابت ذخیره می‌شوند.</p>
            </div>
          </div>
        </section>
      )}

      <section className="bp-frame relative flex flex-col gap-3 p-[16px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px]">تمام تنظیمات این صفحه با هم ذخیره و بلافاصله روی فروشگاه اعمال می‌شوند.</p>
        <BpButton type="submit" variant="primary" isPending={saving}>{isGold ? "ذخیره تنظیمات محصول و قیمت طلا" : "ذخیره تنظیمات محصولات"}</BpButton>
      </section>
    </form>
  );
}
