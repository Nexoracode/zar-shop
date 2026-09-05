"use client";

import { useState, type FormEvent } from "react";
import { toast } from "@heroui/react";
import { Eye, EyeOff, FileText, GripVertical, Plus, Trash2 } from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";
import type { ContentPageId, ContentSettings as ContentSettingsData } from "@/modules/settings/content-settings";
import { contentFieldLimits } from "@/modules/settings/settings-limits";
import { BpButton, BpCheckbox, BpInput, BpKicker, BpTag, BpTextarea } from "./ui";

export function BlueprintContentSettings({ initialSettings }: { initialSettings: ContentSettingsData }) {
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
      setFaqs(result.faqs);
      setPages(result.pages);
      toast.success("محتوا و سوالات متداول ذخیره شد", { description: "تغییرات صفحات منتشرشده و FAQ در سایت اعمال شدند." });
    } catch (reason) {
      toast.danger("ذخیره محتوا انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>سوالات متداول</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">برای تغییر ترتیب، هر سوال را از دستگیره جابه‌جا کنید</p>
        <div className="mt-3 grid gap-2.5">
          {faqs.map((faq, index) => (
            <div
              key={faq.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropFaq(faq.id)}
              className={`border bg-[var(--bp-bg)] p-3 transition ${draggedFaqId === faq.id ? "border-[var(--bp-accent)] opacity-50" : "border-[var(--bp-divider)]"}`}
            >
              <div className="mb-2.5 flex items-center gap-2">
                <span
                  draggable
                  onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", faq.id); setDraggedFaqId(faq.id); }}
                  onDragEnd={() => setDraggedFaqId(null)}
                  title="برای جابه‌جایی بکشید"
                  className="bp-muted shrink-0 cursor-grab active:cursor-grabbing"
                >
                  <GripVertical size={16} />
                </span>
                <span className="bp-muted grid size-7 shrink-0 place-items-center border border-[var(--bp-divider)] text-[11px] font-bold">{(index + 1).toLocaleString("fa-IR")}</span>
                <BpTag tone={faq.enabled ? "success" : "neutral"}>{faq.enabled ? "فعال" : "غیرفعال"}</BpTag>
                <div className="ms-auto flex items-center gap-1">
                  <BpButton type="button" variant="ghost" isIconOnly size="sm" aria-label={`${faq.enabled ? "غیرفعال‌کردن" : "فعال‌کردن"} سوال`} onClick={() => updateFaq(faq.id, { enabled: !faq.enabled })}>{faq.enabled ? <Eye size={15} className="text-[var(--bp-success)]" /> : <EyeOff size={15} className="bp-muted" />}</BpButton>
                  <BpButton type="button" variant="danger" isIconOnly size="sm" aria-label="حذف سوال" onClick={() => setFaqs((current) => current.filter((item) => item.id !== faq.id))}><Trash2 size={14} /></BpButton>
                </div>
              </div>
              <div className="grid gap-[8px]">
                <BpInput label="سوال" maxLength={contentFieldLimits.faqQuestion} value={faq.question} onChange={(event) => updateFaq(faq.id, { question: event.target.value })} />
                <BpTextarea label="پاسخ" rows={2} maxLength={contentFieldLimits.faqAnswer} value={faq.answer} onChange={(event) => updateFaq(faq.id, { answer: event.target.value })} />
              </div>
            </div>
          ))}
        </div>
        <BpButton type="button" variant="secondary" className="mt-3 w-fit gap-2" onClick={() => setFaqs((current) => [...current, { id: crypto.randomUUID(), question: "", answer: "", enabled: true }])}><Plus size={16} />افزودن سوال جدید</BpButton>
      </section>

      <section className="bp-frame relative p-[16px]">
        <BpKicker>صفحات و قوانین</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">محتوای حقوقی و راهنمای خرید</p>
        <div className="mt-3 grid items-start gap-[24px] lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="grid min-w-0 gap-2">
            {pages.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => setSelectedPageId(page.id)}
                className={`flex min-w-0 min-h-11 w-full items-center justify-between gap-3 border px-3 py-2 text-right ${page.id === selectedPage.id ? "border-[var(--bp-accent)] bg-[var(--bp-accent-100)]" : "border-[var(--bp-divider)] bg-[var(--bp-bg)]"}`}
              >
                <span className="flex min-w-0 items-center gap-2"><FileText size={15} className="shrink-0" /><span className="truncate text-[13px]">{page.title}</span></span>
                <BpTag className="shrink-0" tone={page.published ? "success" : "warning"}>{page.published ? "منتشر" : "پیش‌نویس"}</BpTag>
              </button>
            ))}
          </div>
          <div className="grid min-w-0 gap-3 border border-[var(--bp-divider)] p-3">
            <div className="grid gap-[8px] sm:grid-cols-[minmax(0,1fr)_280px]">
              <BpInput label="عنوان صفحه" maxLength={contentFieldLimits.pageTitle} value={selectedPage.title} onChange={(event) => updatePage(selectedPage.id, { title: event.target.value })} />
              <BpCheckbox isSelected={selectedPage.published} onChange={() => updatePage(selectedPage.id, { published: !selectedPage.published })} className="w-full items-center gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
                <span><strong className="block text-[13px] font-bold">انتشار صفحه</strong><span className="bp-muted mt-0.5 block text-[11px] leading-5">صفحه در سایت و فوتر قابل مشاهده باشد</span></span>
              </BpCheckbox>
            </div>
            <div className="grid gap-1.5">
              <BpKicker>محتوای صفحه</BpKicker>
              <RichTextEditor key={selectedPage.id} value={selectedPage.content} onChange={(content) => updatePage(selectedPage.id, { content })} />
            </div>
          </div>
        </div>
      </section>

      <section className="bp-frame relative flex flex-col gap-3 p-[16px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px]">ترتیب FAQ، وضعیت انتشار و محتوای تمام صفحات با هم ذخیره می‌شوند.</p>
        <BpButton type="submit" variant="primary" isPending={saving}>ذخیره تنظیمات محتوا</BpButton>
      </section>
    </form>
  );
}
