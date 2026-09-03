"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { BadgePercent, Check, Gift, Info, ShoppingBag, Truck } from "lucide-react";
import { AdminPageHeader } from "@/components/admin-ui";
import { promotionFieldLimits } from "@/modules/promotions/schemas";
import type { PromotionItem } from "@/components/admin-promotions";
import { BpAsyncMultiSelect, BpButton, BpDateTimeField, BpInput, BpMultiSelect, BpNumberInput, BpSeg, BpSelect, BpSwitch } from "./ui";

type PromotionType = PromotionItem["type"];
type ItemScope = PromotionItem["itemScope"];
type AudienceScope = PromotionItem["audienceScope"];

type CategoryOption = { id: string; name: string; parentId: string | null };
type ProductRef = { id: string; name: string; sku: string };
type UserRef = { id: string; name: string; phone: string | null };

const TYPES: { id: PromotionType; title: string; description: string; icon: React.ReactNode }[] = [
  { id: "COUPON", title: "کد تخفیف", description: "کد عمومی یا اختصاصی با محدودیت مبلغ و تعداد استفاده", icon: <BadgePercent size={17} /> },
  { id: "FREE_SHIPPING", title: "ارسال رایگان", description: "حذف هزینهٔ ارسال برای سفارش‌های واجد شرایط", icon: <Truck size={17} /> },
  { id: "NEXT_PURCHASE", title: "تخفیف خرید بعدی", description: "پاداش بازگشت مشتری پس از تکمیل سفارش", icon: <Gift size={17} /> },
  { id: "FIRST_PURCHASE", title: "خرید اول", description: "پیشنهاد خوش‌آمدگویی برای اولین سفارش مشتری", icon: <ShoppingBag size={17} /> },
];

const fieldLabels: Record<string, string> = { title: "عنوان", code: "کد تخفیف", discountValue: "مقدار تخفیف", startsAt: "شروع اعتبار", endsAt: "پایان اعتبار", rewardExpiresDays: "مهلت پاداش", shippingScope: "محدودهٔ ارسال", itemScope: "دامنهٔ کالا", targetProductIds: "محصولات هدف", targetCategoryIds: "دسته‌های هدف", targetUserIds: "کاربران هدف" };

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="bp-frame relative">
      <div className="border-b border-[var(--bp-divider)] px-4 py-3">
        <h2 className="m-0 text-[14px] font-bold">{title}</h2>
        {description && <p className="bp-muted m-0 mt-1 text-[12px] leading-5">{description}</p>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

const num = (value: string) => { const trimmed = value.trim(); return trimmed ? Number(trimmed) : null; };

async function searchProducts(query: string, signal: AbortSignal): Promise<ProductRef[]> {
  const response = await fetch(`/api/admin/products/search?q=${encodeURIComponent(query)}`, { signal });
  if (!response.ok) return [];
  const data = await response.json().catch(() => null);
  return Array.isArray(data) ? data.map((hit) => ({ id: hit.id, name: hit.name, sku: hit.sku })) : [];
}

async function searchUsers(query: string, signal: AbortSignal): Promise<UserRef[]> {
  const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`, { signal });
  if (!response.ok) return [];
  const data = await response.json().catch(() => null);
  return Array.isArray(data) ? data.map((hit) => ({ id: hit.id, name: hit.name, phone: hit.phone ?? null })) : [];
}

export function BlueprintPromotionForm({ promotion, categories = [], initialTargetProducts = [], initialTargetUsers = [] }: {
  promotion?: PromotionItem;
  categories?: CategoryOption[];
  initialTargetProducts?: ProductRef[];
  initialTargetUsers?: UserRef[];
}) {
  const router = useRouter();
  const editing = Boolean(promotion);

  const [type, setType] = useState<PromotionType>(promotion?.type ?? "COUPON");
  const [title, setTitle] = useState(promotion?.title ?? "");
  const [code, setCode] = useState(promotion?.code ?? "");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">(promotion?.discountType ?? "PERCENT");
  const [discountValue, setDiscountValue] = useState(promotion?.discountValue != null ? String(promotion.discountValue) : "");
  const [minOrderAmount, setMinOrderAmount] = useState(promotion?.minOrderAmount != null ? String(promotion.minOrderAmount) : "");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(promotion?.maxDiscountAmount != null ? String(promotion.maxDiscountAmount) : "");
  const [usageLimit, setUsageLimit] = useState(promotion?.usageLimit != null ? String(promotion.usageLimit) : "");
  const [perUserLimit, setPerUserLimit] = useState(String(promotion?.perUserLimit ?? 1));
  const [rewardExpiresDays, setRewardExpiresDays] = useState(String(promotion?.rewardExpiresDays ?? 30));
  const [shippingScope, setShippingScope] = useState<"ALL" | "TEHRAN">(promotion?.shippingScope ?? "ALL");
  const [startsAt, setStartsAt] = useState<string | null>(promotion?.startsAt ?? null);
  const [endsAt, setEndsAt] = useState<string | null>(promotion?.endsAt ?? null);
  const [isActive, setIsActive] = useState(promotion?.isActive ?? true);

  const [itemScope, setItemScope] = useState<ItemScope>(promotion?.itemScope ?? "ALL");
  const [audienceScope, setAudienceScope] = useState<AudienceScope>(promotion?.audienceScope ?? "ALL");
  const [targetProducts, setTargetProducts] = useState<ProductRef[]>(initialTargetProducts);
  const [targetCategoryIds, setTargetCategoryIds] = useState<string[]>(promotion?.targetCategoryIds ?? []);
  const [targetUsers, setTargetUsers] = useState<UserRef[]>(initialTargetUsers);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const isCoupon = type === "COUPON";
  const isFreeShipping = type === "FREE_SHIPPING";
  const needsDiscount = type === "COUPON" || type === "NEXT_PURCHASE" || type === "FIRST_PURCHASE";
  const canScopeItems = type === "COUPON" || type === "FIRST_PURCHASE" || type === "NEXT_PURCHASE";
  const effectiveItemScope: ItemScope = canScopeItems ? itemScope : "ALL";
  const clear = (key: string) => setErrors((current) => (current[key] ? { ...current, [key]: undefined as unknown as string } : current));

  const categoryName = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const categoryOptions = useMemo(
    () => categories.map((category) => ({
      value: category.id,
      label: category.parentId && categoryName.get(category.parentId) ? `${categoryName.get(category.parentId)} › ${category.name}` : category.name,
    })),
    [categories, categoryName],
  );

  async function submit() {
    const found: Record<string, string> = {};
    if (title.trim().length < 3) found.title = "عنوان باید حداقل ۳ نویسه باشد.";
    if (!startsAt) found.startsAt = "زمان شروع اعتبار را مشخص کنید.";
    if (!endsAt) found.endsAt = "زمان پایان اعتبار را مشخص کنید.";
    if (startsAt && endsAt && endsAt < startsAt) found.endsAt = "پایان اعتبار باید بعد از شروع آن باشد.";
    if (isCoupon && !/^[A-Za-z0-9_-]{3,64}$/.test(code.trim())) found.code = "کد تخفیف باید ۳ تا ۶۴ نویسهٔ انگلیسی، رقم، خط تیره یا آندرلاین باشد.";
    if (needsDiscount && !num(discountValue)) found.discountValue = "مقدار تخفیف را وارد کنید.";
    if (canScopeItems && itemScope === "PRODUCTS" && targetProducts.length === 0) found.targetProductIds = "دست‌کم یک محصول انتخاب کنید.";
    if (canScopeItems && itemScope === "CATEGORIES" && targetCategoryIds.length === 0) found.targetCategoryIds = "دست‌کم یک دسته انتخاب کنید.";
    if (audienceScope === "SPECIFIC_USERS" && targetUsers.length === 0) found.targetUserIds = "دست‌کم یک کاربر انتخاب کنید.";
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }

    const payload = {
      title: title.trim(),
      type,
      code: isCoupon ? code.trim().toUpperCase() : null,
      discountType: isFreeShipping ? null : discountType,
      discountValue: isFreeShipping ? null : num(discountValue),
      minOrderAmount: num(minOrderAmount),
      maxDiscountAmount: isFreeShipping ? null : num(maxDiscountAmount),
      usageLimit: num(usageLimit),
      perUserLimit: num(perUserLimit) ?? 1,
      rewardExpiresDays: type === "NEXT_PURCHASE" ? num(rewardExpiresDays) : null,
      shippingScope: isFreeShipping ? shippingScope : null,
      itemScope: effectiveItemScope,
      targetProductIds: effectiveItemScope === "PRODUCTS" ? targetProducts.map((product) => product.id) : [],
      targetCategoryIds: effectiveItemScope === "CATEGORIES" ? targetCategoryIds : [],
      audienceScope,
      targetUserIds: audienceScope === "SPECIFIC_USERS" ? targetUsers.map((user) => user.id) : [],
      startsAt,
      endsAt,
      isActive,
    };

    setSaving(true);
    try {
      const response = await fetch(editing ? `/api/admin/promotions/${promotion!.id}` : "/api/admin/promotions", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null) as { message?: string; issues?: Record<string, string[] | undefined> } | null;
      if (!response.ok) {
        if (data?.issues) {
          const mapped: Record<string, string> = {};
          for (const [key, messages] of Object.entries(data.issues)) if (messages?.length) mapped[key] = messages[0]!;
          setErrors(mapped);
          const first = Object.keys(mapped)[0];
          toast.danger("اطلاعات پروموشن کامل نیست", { description: first ? `${fieldLabels[first] ?? first}: ${mapped[first]}` : undefined });
        } else {
          toast.danger("ذخیرهٔ پروموشن انجام نشد", { description: data?.message ?? "ارتباط با سرور برقرار نشد." });
        }
        setSaving(false);
        return;
      }
      toast.success(editing ? "پروموشن ویرایش شد." : "پروموشن ساخته شد.", { description: "قواعد کمپین از این لحظه در محاسبات سفارش بررسی می‌شوند." });
      router.push("/admin/promotions");
      router.refresh();
    } catch {
      toast.danger("ذخیرهٔ پروموشن انجام نشد", { description: "ارتباط با سرور برقرار نشد." });
      setSaving(false);
    }
  }

  const priceInput = (label: string, value: string, onChange: (value: string) => void, key: string, placeholder?: string) => (
    <BpNumberInput label={label} isPrice showWords={false} value={value} error={errors[key]} placeholder={placeholder} onValueChange={(next) => { onChange(next); clear(key); }} />
  );

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader flush title={editing ? `ویرایش «${promotion!.title}»` : "پروموشن جدید"} description="شرایط واجدبودن، محدودیت مصرف، بازهٔ اعتبار و اثر مالی این کمپین را مشخص کنید." backHref="/admin/promotions" backLabel="بازگشت به پروموشن‌ها" />

      <Panel title="نوع پروموشن" description="هر پروموشن قواعد و محدودیت‌های مخصوص خودش را دارد.">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {TYPES.map((entry) => {
            const active = type === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                aria-pressed={active}
                onClick={() => setType(entry.id)}
                className={`grid content-start gap-2 border p-3 text-start transition ${active ? "border-[var(--bp-accent)] bg-[var(--bp-accent-100)]" : "border-[var(--bp-divider)] hover:border-[var(--bp-accent)]"}`}
              >
                <span className="flex items-center justify-between">
                  <span className="text-[var(--bp-muted)]">{entry.icon}</span>
                  {active && <Check size={14} className="text-[var(--bp-accent)]" aria-hidden />}
                </span>
                <strong className="block text-[12px]">{entry.title}</strong>
                <span className="bp-muted block text-[11px] leading-5">{entry.description}</span>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title="اطلاعات پایه">
        <div className="grid gap-3 lg:grid-cols-2">
          <BpInput name="title" label="عنوان داخلی پروموشن" required maxLength={promotionFieldLimits.title} value={title} error={errors.title} placeholder="مثلاً کمپین پایان تابستان" onChange={(event) => { setTitle(event.target.value); clear("title"); }} />
          <BpSwitch isSelected={isActive} onChange={setIsActive}>پروموشن فعال باشد</BpSwitch>
          <BpDateTimeField label="شروع اعتبار" value={startsAt} error={errors.startsAt} onChange={(next) => { setStartsAt(next); clear("startsAt"); }} />
          <BpDateTimeField label="پایان اعتبار" value={endsAt} error={errors.endsAt} onChange={(next) => { setEndsAt(next); clear("endsAt"); }} />
        </div>
        <p className="bp-muted m-0 mt-2 flex items-start gap-1.5 text-[12px] leading-5">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
          فقط پروموشن فعال و درون بازهٔ اعتبار وارد محاسبات سفارش می‌شود؛ مقادیر اعمال‌شده در سفارش snapshot می‌شوند.
        </p>
      </Panel>

      <Panel title="قواعد و محدودیت‌ها">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {isCoupon && (
            <BpInput name="code" label="کد تخفیف" required dir="ltr" maxLength={promotionFieldLimits.code} value={code} error={errors.code} placeholder="WELCOME20" onChange={(event) => { setCode(event.target.value); clear("code"); }} />
          )}
          {!isFreeShipping && (
            <>
              <BpSelect label={type === "NEXT_PURCHASE" ? "نوع پاداش" : "نوع تخفیف"} value={discountType} onChange={(event) => setDiscountType(event.target.value === "FIXED" ? "FIXED" : "PERCENT")} options={[{ value: "PERCENT", label: "درصدی" }, { value: "FIXED", label: type === "NEXT_PURCHASE" ? "اعتبار مبلغی" : "مبلغ ثابت" }]} />
              {discountType === "FIXED"
                ? priceInput(type === "NEXT_PURCHASE" ? "مقدار پاداش (ریال)" : "مقدار تخفیف (ریال)", discountValue, setDiscountValue, "discountValue")
                : <BpNumberInput label={type === "NEXT_PURCHASE" ? "درصد پاداش" : "درصد تخفیف"} value={discountValue} error={errors.discountValue} placeholder="مثلاً ۲۰" onValueChange={(next) => { setDiscountValue(next); clear("discountValue"); }} />}
            </>
          )}
          {isFreeShipping && (
            <BpSelect label="محدودهٔ ارسال" value={shippingScope} error={errors.shippingScope} onChange={(event) => setShippingScope(event.target.value === "TEHRAN" ? "TEHRAN" : "ALL")} options={[{ value: "ALL", label: "تمام شهرها" }, { value: "TEHRAN", label: "فقط تهران" }]} />
          )}
          {type === "NEXT_PURCHASE" && (
            <BpNumberInput label="مهلت استفاده از پاداش (روز)" required value={rewardExpiresDays} error={errors.rewardExpiresDays} onValueChange={(next) => { setRewardExpiresDays(next); clear("rewardExpiresDays"); }} />
          )}
          {priceInput(type === "NEXT_PURCHASE" ? "حداقل مبلغ خرید فعلی" : "حداقل مبلغ سفارش", minOrderAmount, setMinOrderAmount, "minOrderAmount", "بدون محدودیت")}
          {!isFreeShipping && priceInput("سقف مبلغ تخفیف", maxDiscountAmount, setMaxDiscountAmount, "maxDiscountAmount", "بدون سقف")}
          <BpNumberInput label="ظرفیت کل استفاده" value={usageLimit} error={errors.usageLimit} placeholder="بدون محدودیت" onValueChange={(next) => { setUsageLimit(next); clear("usageLimit"); }} />
          <BpNumberInput label="سقف استفادهٔ هر مشتری" value={perUserLimit} error={errors.perUserLimit} onValueChange={(next) => { setPerUserLimit(next); clear("perUserLimit"); }} />
        </div>
      </Panel>

      <Panel title="هدف‌گیری" description="پیش‌فرض روی همهٔ سبد و همهٔ کاربران اعمال می‌شود؛ در صورت نیاز آن را به محصول، دسته یا گروهی از کاربران محدود کنید.">
        <div className="grid gap-4">
          {canScopeItems && (
            <div className="grid gap-2">
              <BpSeg
                label="دامنهٔ کالا"
                value={itemScope}
                onChange={(next) => { setItemScope(next); clear("itemScope"); clear("targetProductIds"); clear("targetCategoryIds"); }}
                options={[{ value: "ALL", label: "همهٔ محصولات" }, { value: "PRODUCTS", label: "محصولات خاص" }, { value: "CATEGORIES", label: "دسته‌های خاص" }]}
              />
              <p className="bp-muted m-0 mt-1 text-[11px] leading-5">تخفیف فقط روی جمع اقلام مشمول در سبد اعمال می‌شود؛ حداقل مبلغ سفارش روی کل سبد بررسی می‌شود.</p>
              {itemScope === "PRODUCTS" && (
                <BpAsyncMultiSelect<ProductRef>
                  label="محصولات هدف"
                  required
                  error={errors.targetProductIds}
                  tokens={targetProducts.map((product) => ({ value: product.id, label: product.name, hint: product.sku }))}
                  onAdd={(hit) => { setTargetProducts((current) => (current.some((item) => item.id === hit.id) ? current : [...current, hit])); clear("targetProductIds"); }}
                  onRemove={(value) => setTargetProducts((current) => current.filter((item) => item.id !== value))}
                  search={searchProducts}
                  renderHit={(hit) => ({ label: hit.name, hint: hit.sku })}
                  searchPlaceholder="نام یا کد محصول"
                />
              )}
              {itemScope === "CATEGORIES" && (
                <BpMultiSelect
                  label="دسته‌های هدف"
                  required
                  error={errors.targetCategoryIds}
                  tokens={targetCategoryIds.map((id) => ({ value: id, label: categoryName.get(id) ?? id, optionValue: id }))}
                  options={categoryOptions}
                  onAdd={(value) => { setTargetCategoryIds((current) => (current.includes(value) ? current : [...current, value])); clear("targetCategoryIds"); }}
                  onRemove={(value) => setTargetCategoryIds((current) => current.filter((id) => id !== value))}
                  searchPlaceholder="نام دسته"
                />
              )}
            </div>
          )}

          <div className="grid gap-2">
            <BpSeg
              label="مخاطب"
              value={audienceScope}
              onChange={(next) => { setAudienceScope(next); clear("targetUserIds"); }}
              options={[{ value: "ALL", label: "همهٔ کاربران" }, { value: "SPECIFIC_USERS", label: "کاربران خاص" }]}
            />
            {audienceScope === "SPECIFIC_USERS" && (
              <BpAsyncMultiSelect<UserRef>
                label="کاربران هدف"
                required
                error={errors.targetUserIds}
                tokens={targetUsers.map((user) => ({ value: user.id, label: user.name, hint: user.phone ?? undefined }))}
                onAdd={(hit) => { setTargetUsers((current) => (current.some((item) => item.id === hit.id) ? current : [...current, hit])); clear("targetUserIds"); }}
                onRemove={(value) => setTargetUsers((current) => current.filter((item) => item.id !== value))}
                search={searchUsers}
                renderHit={(hit) => ({ label: hit.name, hint: hit.phone ?? undefined })}
                searchPlaceholder="نام، تلفن یا ایمیل"
              />
            )}
          </div>
        </div>
      </Panel>

      <div className="bp-frame flex items-center justify-end gap-2 p-3">
        <BpButton type="button" disabled={saving} onClick={() => router.push("/admin/promotions")}>انصراف</BpButton>
        <BpButton type="button" variant="primary" isPending={saving} onClick={() => void submit()}>{editing ? "ذخیرهٔ تغییرات" : "ذخیرهٔ پروموشن"}</BpButton>
      </div>
    </div>
  );
}
