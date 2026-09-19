"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "@heroui/react";
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import type { SeoSettings } from "@/modules/settings/seo-settings";
import { BpButton, BpCheckbox, BpInput, BpKicker, BpTabs, BpTag, BpTextarea } from "./ui";

type TabId = "basic" | "pruning" | "sitemap" | "schema";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "basic", label: "تنظیمات پایه" },
  { id: "pruning", label: "هرس محتوا" },
  { id: "sitemap", label: "سایت‌مپ" },
  { id: "schema", label: "اسکیما" },
];

function OptionCheckbox({ title, description, isSelected, onChange }: { title: string; description: string; isSelected: boolean; onChange: (value: boolean) => void }) {
  return (
    <BpCheckbox isSelected={isSelected} onChange={() => onChange(!isSelected)} className="w-full items-center gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
      <span><strong className="block text-[13px] font-bold">{title}</strong><span className="bp-muted mt-0.5 block text-[11px] leading-5">{description}</span></span>
    </BpCheckbox>
  );
}

// ————— Content-pruning list (noindex / 410 / canonical / redirect) —————

type PairKeys = { source: string; target: string };
type RuleRow = Record<string, string> & { id: string; createdAt: string };

function SeoRuleList({ title, description, endpoint, pair, sourceLabel, targetLabel }: {
  title: string;
  description: string;
  endpoint: string;
  pair?: PairKeys;
  sourceLabel: string;
  targetLabel?: string;
}) {
  const sourceKey = pair?.source ?? "url";
  const targetKey = pair?.target;

  const [rows, setRows] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<RuleRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await requestJson<RuleRow[]>(endpoint, {}, { fallbackMessage: "دریافت فهرست انجام نشد." }));
    } catch (reason) {
      toast.danger("دریافت فهرست انجام نشد", { description: requestErrorMessage(reason) });
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    let active = true;
    requestJson<RuleRow[]>(endpoint, {}, { fallbackMessage: "دریافت فهرست انجام نشد." })
      .then((data) => { if (active) setRows(data); })
      .catch((reason) => { if (active) toast.danger("دریافت فهرست انجام نشد", { description: requestErrorMessage(reason) }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [endpoint]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdding(true);
    try {
      const body = targetKey ? { [sourceKey]: source, [targetKey]: target } : { [sourceKey]: source };
      await requestJson(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, { fallbackMessage: "ثبت قاعده انجام نشد." });
      toast.success("قاعده ثبت شد");
      setSource("");
      setTarget("");
      await load();
    } catch (reason) {
      toast.danger("ثبت قاعده انجام نشد", { description: requestErrorMessage(reason) });
    } finally {
      setAdding(false);
    }
  }

  async function remove(row: RuleRow) {
    setRemoving(row.id);
    try {
      await requestJson(endpoint, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [sourceKey]: row[sourceKey] }) }, { fallbackMessage: "حذف قاعده انجام نشد." });
      toast.success("قاعده حذف شد");
      setRows((current) => current.filter((item) => item.id !== row.id));
    } catch (reason) {
      toast.danger("حذف قاعده انجام نشد", { description: requestErrorMessage(reason) });
    } finally {
      setRemoving(null);
    }
  }

  async function confirmRemoval() {
    if (!pendingRemoval) return;
    await remove(pendingRemoval);
    setPendingRemoval(null);
  }

  return (
    <section className="bp-frame relative p-[16px]">
      <BpKicker>{title}</BpKicker>
      <p className="bp-muted m-0 mt-1 text-[12px] leading-6">{description}</p>

      <form onSubmit={add} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className={`grid gap-2 ${targetKey ? "sm:grid-cols-2" : ""}`}>
          <BpInput label={sourceLabel} dir="ltr" required maxLength={500} placeholder="/old-page" value={source} onChange={(event) => setSource(event.target.value)} />
          {targetKey && <BpInput label={targetLabel} dir="ltr" required maxLength={500} placeholder="/new-page" value={target} onChange={(event) => setTarget(event.target.value)} />}
        </div>
        <BpButton type="submit" variant="primary" isPending={adding} className="gap-1.5 sm:mt-[22px]"><Plus size={15} />اقدام</BpButton>
      </form>

      <div className="mt-3 border-t border-[var(--bp-divider)] pt-3">
        {loading ? (
          <p className="bp-muted m-0 flex items-center gap-2 py-2 text-[12px]"><Loader2 size={14} className="animate-spin" />در حال بارگذاری…</p>
        ) : rows.length === 0 ? (
          <p className="bp-muted m-0 py-2 text-[12px]">قاعده‌ای ثبت نشده است.</p>
        ) : (
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center gap-2 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-2 text-[12px]">
                <span dir="ltr" className="min-w-0 flex-1 truncate font-mono">
                  {row[sourceKey]}{targetKey && <span className="bp-muted"> ← {row[targetKey]}</span>}
                </span>
                <BpButton type="button" isIconOnly size="sm" variant="ghost" className="bp-btn-danger-icon" aria-label={`حذف ${row[sourceKey]}`} isPending={removing === row.id} onClick={() => setPendingRemoval(row)}>
                  <Trash2 size={14} />
                </BpButton>
              </li>
            ))}
          </ul>
        )}
      </div>
      <DeleteConfirmDialog
        open={Boolean(pendingRemoval)}
        title="حذف قاعده"
        itemName={pendingRemoval?.[sourceKey]}
        confirmLabel="حذف قاعده"
        description="این قاعده حذف می‌شود و دیگر روی نشانی اعمال نخواهد شد."
        loading={removing !== null && removing === pendingRemoval?.id}
        onClose={() => setPendingRemoval(null)}
        onConfirm={() => void confirmRemoval()}
      />
    </section>
  );
}

// ————— Main component —————

export function BlueprintSeoSettings({ initialSettings }: { initialSettings: SeoSettings }) {
  const [tab, setTab] = useState<TabId>("basic");
  const [form, setForm] = useState<SeoSettings>(initialSettings);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof SeoSettings>(key: K, value: SeoSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveBasic(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSaving(true);
    try {
      const saved = await requestJson<SeoSettings>("/api/admin/settings/seo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }, { fallbackMessage: "ذخیره تنظیمات SEO انجام نشد." });
      setForm(saved);
      toast.success("تنظیمات SEO ذخیره شد", { description: "تغییرات روی متادیتا و سایت‌مپ اعمال شد." });
    } catch (reason) {
      toast.danger("ذخیره تنظیمات SEO انجام نشد", { description: requestErrorMessage(reason) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="bp-frame relative overflow-hidden">
        <BpTabs label="بخش‌های SEO">
          {TABS.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className="bp-tab" onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </BpTabs>
      </div>

      {tab === "basic" && (
        <form onSubmit={saveBasic} className="grid gap-2">
          <section className="bp-frame relative p-[16px]">
            <BpKicker>متادیتای پیش‌فرض</BpKicker>
            <p className="bp-muted m-0 mt-1 text-[12px] leading-6">عنوان و توضیحی که موتورهای جستجو برای صفحهٔ اصلی و صفحات بدون متای اختصاصی استفاده می‌کنند.</p>
            <div className="mt-3 grid gap-3">
              <BpInput label="عنوان پیش‌فرض سایت" maxLength={120} value={form.metaTitle} onChange={(event) => set("metaTitle", event.target.value)} hint="خالی بماند از نام فروشگاه استفاده می‌شود." />
              <BpTextarea label="توضیحات متا" rows={3} maxLength={320} value={form.metaDescription} onChange={(event) => set("metaDescription", event.target.value)} hint="خالی بماند از توضیح کوتاه فروشگاه استفاده می‌شود." />
              <BpInput label="دامنه اصلی (Canonical)" dir="ltr" maxLength={100} value={form.canonicalDomain} onChange={(event) => set("canonicalDomain", event.target.value)} hint="آدرس کامل مانند https://zargallery.ir" />
            </div>
          </section>

          <section className="bp-frame relative p-[16px]">
            <BpKicker>ایندکس و اسکیما</BpKicker>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <OptionCheckbox title="اجازه ایندکس موتورهای جستجو" description="با خاموش‌کردن، کل سایت noindex می‌شود و از robots.txt هم حذف می‌گردد." isSelected={form.allowIndexing} onChange={(value) => set("allowIndexing", value)} />
              <OptionCheckbox title="Structured Data محصولات" description="درج اسکیمای Product شامل قیمت و موجودی در صفحهٔ محصول." isSelected={form.enableProductSchema} onChange={(value) => set("enableProductSchema", value)} />
            </div>
          </section>

          <section className="bp-frame relative flex justify-end p-[16px]">
            <BpButton type="submit" variant="primary" isPending={saving}>ذخیره تنظیمات</BpButton>
          </section>
        </form>
      )}

      {tab === "pruning" && (
        <div className="grid gap-2">
          <SeoRuleList
            title="حذف از ایندکس (noindex)"
            description="این نشانی‌ها با هدر X-Robots-Tag: noindex به موتور جستجو معرفی می‌شوند و از سایت‌مپ حذف می‌گردند."
            endpoint="/api/admin/seo/noindex"
            sourceLabel="نشانی صفحه"
          />
          <SeoRuleList
            title="صفحهٔ حذف‌شده (HTTP 410)"
            description="درخواست این نشانی‌ها با کد ۴۱۰ پاسخ داده می‌شود تا موتور جستجو حذف دائمی صفحه را سریع‌تر بپذیرد."
            endpoint="/api/admin/seo/gone"
            sourceLabel="نشانی صفحه"
          />
          <SeoRuleList
            title="کنونیکال دستی"
            description="برای نشانی مبدأ، تگ canonical به نشانی مقصد اشاره می‌کند. مبدأ از سایت‌مپ حذف می‌شود."
            endpoint="/api/admin/seo/canonical"
            pair={{ source: "sourceUrl", target: "targetUrl" }}
            sourceLabel="نشانی مبدأ"
            targetLabel="نشانی کنونیکال (مقصد)"
          />
          <SeoRuleList
            title="ریدایرکت ۳۰۱"
            description="درخواست نشانی مبدأ به‌صورت دائمی (۳۰۱) به نشانی مقصد هدایت می‌شود. در سطح سرور اعمال می‌گردد."
            endpoint="/api/admin/seo/redirect"
            pair={{ source: "fromUrl", target: "toUrl" }}
            sourceLabel="از نشانی"
            targetLabel="به نشانی"
          />
        </div>
      )}

      {tab === "sitemap" && (
        <section className="bp-frame relative p-[16px]">
          <BpKicker>وضعیت سایت‌مپ</BpKicker>
          <div className="mt-3 grid gap-3 text-[12px] leading-6">
            <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 font-bold text-[var(--bp-accent)]">
              مشاهدهٔ sitemap.xml <ExternalLink size={14} />
            </a>
            <p className="bp-muted m-0">سایت‌مپ هر ۴ ساعت یک‌بار کش می‌شود و علاوه بر آن با هر تغییر محصول، صفحهٔ محتوا یا قاعدهٔ SEO بازسازی می‌شود.</p>
            <div className="border-t border-[var(--bp-divider)] pt-3">
              <strong className="block text-[13px]">یک نشانی فقط وقتی در سایت‌مپ می‌آید که هر سه شرط برقرار باشد:</strong>
              <ol className="mt-2 grid list-decimal gap-1 pr-5">
                <li>پاسخ HTTP 200 بدهد (نه ۴۱۰ و نه ریدایرکت).</li>
                <li>در فهرست noindex نباشد.</li>
                <li>خودکنونیکال باشد؛ یعنی کنونیکال دستی به نشانی دیگری نداشته باشد.</li>
              </ol>
            </div>
          </div>
        </section>
      )}

      {tab === "schema" && (
        <div className="grid gap-2">
          <section className="bp-frame relative p-[16px]">
            <BpKicker>Structured Data</BpKicker>
            <p className="bp-muted m-0 mt-1 text-[12px] leading-6">وضعیت درج اسکیمای محصول. با ذخیره، همان تنظیمات تب «تنظیمات پایه» به‌روزرسانی می‌شود.</p>
            <div className="mt-3 grid gap-2.5">
              <OptionCheckbox title="اسکیمای Product در صفحهٔ محصول" description="نام، توضیح، تصویر، قیمت، موجودی و امتیاز کاربران." isSelected={form.enableProductSchema} onChange={(value) => set("enableProductSchema", value)} />
              <div className="flex justify-end">
                <BpButton type="button" variant="primary" isPending={saving} onClick={() => void saveBasic()}>ذخیره</BpButton>
              </div>
            </div>
          </section>

          <section className="bp-frame relative p-[16px]">
            <BpKicker>انواع اسکیمای تولیدشده</BpKicker>
            <ul className="m-0 mt-3 grid list-none gap-1.5 p-0 text-[12px]">
              <li className="flex items-center gap-2 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-2"><BpTag tone="success">فعال</BpTag> Product — صفحهٔ محصول</li>
              <li className="flex items-center gap-2 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-2"><BpTag tone="success">فعال</BpTag> Article + BreadcrumbList — صفحات وبلاگ</li>
              <li className="flex items-center gap-2 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-2"><BpTag tone="success">فعال</BpTag> FAQPage — سوالات متداول</li>
            </ul>
            <a href="https://search.google.com/test/rich-results" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-[12px] font-bold text-[var(--bp-accent)]">
              تست صفحه با ابزار Rich Results گوگل <ExternalLink size={14} />
            </a>
          </section>
        </div>
      )}
    </div>
  );
}
