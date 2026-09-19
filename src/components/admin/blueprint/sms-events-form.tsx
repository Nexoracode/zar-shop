"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "@heroui/react";
import { AlertTriangle, SlidersHorizontal } from "lucide-react";
import type { CommunicationSettingsData } from "@/modules/communications/communication-settings";
import { smsEventFlagKey, smsEventIds, smsEventRule, smsEvents, type SmsEventId, type SmsEventInfo, type SmsEventRule } from "@/modules/communications/sms-events";
import type { SmsPattern } from "@/modules/communications/sms-pattern-schemas";
import { SmsEventDialog, type SmsEventPatterns } from "./sms-event-dialog";
import { BpButton, BpKicker, BpSpinner, BpSwitch, BpTag } from "./ui";

const groups = [
  { audience: "CUSTOMER", title: "پیامک به مشتری" },
  { audience: "ADMIN", title: "پیامک به مدیر" },
] as const;

async function patchSettings(body: unknown) {
  const response = await fetch("/api/admin/sms/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message ?? "تنظیمات ذخیره نشد.");
}

function EventTile({ info, enabled, rule, isPending, onToggle, onEdit }: { info: SmsEventInfo; enabled: boolean; rule: SmsEventRule; isPending: boolean; onToggle: (value: boolean) => void; onEdit: () => void }) {
  const variableCount = Object.keys(rule.bindings).length;
  return (
    <article className={`bp-frame relative flex flex-col gap-2 p-3 transition-opacity ${enabled ? "" : "opacity-65"}`}>
      <div className="flex items-start justify-between gap-2">
        <strong className="text-[13px] leading-6">{info.label}</strong>
        <span className="flex shrink-0 items-center gap-1.5">
          {isPending && <BpSpinner size={13} />}
          <BpSwitch isSelected={enabled} isDisabled={isPending} onChange={onToggle}><span className="sr-only">{`فعال بودن پیامک ${info.label}`}</span></BpSwitch>
        </span>
      </div>
      <p className="bp-muted m-0 text-[11px] leading-5">{info.description}</p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {rule.mode === "PATTERN" && rule.patternCode
          ? <BpTag tone="accent"><span dir="ltr" className="font-mono">{rule.patternCode}</span>{variableCount > 0 && <span> · {variableCount.toLocaleString("fa-IR")} متغیر</span>}</BpTag>
          : <BpTag tone="neutral">متن ساده</BpTag>}
        <BpButton variant="ghost" size="sm" onClick={onEdit} className="gap-1.5"><SlidersHorizontal size={13} />تنظیم</BpButton>
      </div>
    </article>
  );
}

/**
 * Every automated message on one screen: switch it on or off, and open its settings to choose a
 * registered Faraz pattern (each variable bound to an order value) or a plain text. Each change is
 * saved on its own, so there is no page-wide save to forget.
 */
export function BlueprintSmsEventsForm({ initialSettings, storeName, providerReady }: { initialSettings: CommunicationSettingsData; storeName: string; providerReady: boolean }) {
  const [flags, setFlags] = useState(() => Object.fromEntries(smsEventIds.map((id) => [id, initialSettings[smsEventFlagKey(id)]])) as Record<SmsEventId, boolean>);
  const [templates, setTemplates] = useState<Record<SmsEventId, string>>(initialSettings.templates);
  const [rules, setRules] = useState(() => Object.fromEntries(smsEventIds.map((id) => [id, smsEventRule(initialSettings.eventRules, id)])) as Record<SmsEventId, SmsEventRule>);
  const [patterns, setPatterns] = useState<SmsEventPatterns>(providerReady ? { status: "loading" } : { status: "error", message: "برای انتخاب پترن، ابتدا فراز اس‌ام‌اس را پیکربندی و فعال کنید." });
  const [pendingId, setPendingId] = useState<SmsEventId | null>(null);
  const [editingId, setEditingId] = useState<SmsEventId | null>(null);

  useEffect(() => {
    if (!providerReady) return;
    let cancelled = false;
    fetch("/api/admin/sms/patterns")
      .then(async (response) => {
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.message ?? "دریافت پترن‌ها انجام نشد.");
        return Array.isArray(result) ? (result as SmsPattern[]) : [];
      })
      .then((list) => { if (!cancelled) setPatterns({ status: "ready", patterns: list }); })
      .catch((error) => { if (!cancelled) setPatterns({ status: "error", message: error instanceof Error ? error.message : "دریافت پترن‌ها انجام نشد." }); });
    return () => { cancelled = true; };
  }, [providerReady]);

  async function toggle(id: SmsEventId, value: boolean) {
    setPendingId(id);
    setFlags((current) => ({ ...current, [id]: value }));
    try {
      await patchSettings({ [smsEventFlagKey(id)]: value });
    } catch (error) {
      setFlags((current) => ({ ...current, [id]: !value }));
      toast.danger("ذخیره انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setPendingId(null);
    }
  }

  async function saveEvent(id: SmsEventId, draft: { rule: SmsEventRule; template: string }) {
    setPendingId(id);
    try {
      await patchSettings({ templates: { [id]: draft.template }, eventRules: { [id]: draft.rule } });
      setRules((current) => ({ ...current, [id]: draft.rule }));
      setTemplates((current) => ({ ...current, [id]: draft.template }));
      setEditingId(null);
      toast.success("تنظیمات پیامک ذخیره شد");
    } catch (error) {
      toast.danger("ذخیره انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setPendingId(null);
    }
  }

  const editing = editingId ? smsEvents.find((info) => info.id === editingId) : undefined;
  return (
    <div className="grid gap-5">
      {!initialSettings.smsEnabled && (
        <div className="bp-frame relative flex items-start gap-3 border-[var(--bp-warning)] p-3">
          <AlertTriangle size={16} className="mt-1 shrink-0 text-[var(--bp-warning)]" />
          <p className="m-0 text-[12px] leading-6">ارسال پیامک هنوز خاموش است و هیچ‌کدام از این پیامک‌ها نمی‌رود. <Link href="/admin/settings/notifications/preferences" className="font-bold text-[var(--bp-accent)]">روشن‌کردن ←</Link></p>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.audience}>
          <BpKicker>{group.title}</BpKicker>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {smsEvents.filter((info) => info.audience === group.audience).map((info) => (
              <EventTile key={info.id} info={info} enabled={flags[info.id]} rule={rules[info.id]} isPending={pendingId === info.id} onToggle={(value) => void toggle(info.id, value)} onEdit={() => setEditingId(info.id)} />
            ))}
          </div>
        </section>
      ))}

      <p className="bp-muted m-0 text-[11px] leading-5">«پترن» فوری ارسال می‌شود؛ «متن ساده» پیش از ارسال توسط اپراتور فراز تأیید می‌شود. <Link href="/admin/settings/notifications/patterns" className="font-bold text-[var(--bp-accent)]">مدیریت پترن‌ها ←</Link></p>

      {editing && (
        <SmsEventDialog
          key={editing.id}
          info={editing}
          rule={rules[editing.id]}
          template={templates[editing.id]}
          patterns={patterns}
          storeName={storeName}
          isSaving={pendingId === editing.id}
          onSave={(draft) => void saveEvent(editing.id, draft)}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
