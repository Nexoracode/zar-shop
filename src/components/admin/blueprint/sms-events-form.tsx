"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "@heroui/react";
import { AlertTriangle, Info } from "lucide-react";
import type { CommunicationSettingsData } from "@/modules/communications/communication-settings";
import { communicationFieldLimits } from "@/modules/communications/limits";
import { guessEventVariable, smsEventFlagKey, smsEventIds, smsEventRule, smsEventVariables, smsEvents, type SmsEventId, type SmsEventInfo, type SmsEventRule, type SmsEventVariable } from "@/modules/communications/sms-events";
import type { SmsPattern } from "@/modules/communications/sms-pattern-schemas";
import { BpButton, BpSelect, BpSeg, BpSpinner, BpSwitch, BpTag, BpTextarea } from "./ui";

type Patterns = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; patterns: SmsPattern[] };
type Errors = Record<string, string>;
type VariableRow = { name: string; length: number; type: string };

const tokenClass = "border border-[var(--bp-divider)] px-1.5 py-0.5 font-mono text-[11px]";

function patternLabel(pattern: SmsPattern) {
  const text = pattern.text.length > 40 ? `${pattern.text.slice(0, 40)}…` : pattern.text;
  return `${text} (${pattern.code})`;
}

function EventCard({ info, enabled, onEnabled, template, onTemplate, rule, onRule, patterns, storeName, errors, clearError }: {
  info: SmsEventInfo;
  enabled: boolean;
  onEnabled: (value: boolean) => void;
  template: string;
  onTemplate: (value: string) => void;
  rule: SmsEventRule;
  onRule: (rule: SmsEventRule) => void;
  patterns: Patterns;
  storeName: string;
  errors: Errors;
  clearError: (key: string) => void;
}) {
  const allowed: readonly SmsEventVariable[] = info.variables;
  const pattern = patterns.status === "ready" ? patterns.patterns.find((item) => item.code === rule.patternCode) : undefined;
  // The variables to map: the chosen pattern's own, or — when its list cannot be loaded — the ones already saved.
  const rows: VariableRow[] = pattern ? pattern.vars.map((variable) => ({ name: variable.var, length: variable.length, type: variable.type })) : Object.entries(rule.bindings).map(([name, binding]) => ({ name, length: binding.maxLength, type: "" }));

  function changePattern(code: string) {
    const chosen = patterns.status === "ready" ? patterns.patterns.find((item) => item.code === code) : undefined;
    const bindings: SmsEventRule["bindings"] = {};
    for (const variable of chosen?.vars ?? []) {
      const source = guessEventVariable(variable.var, allowed);
      if (source) bindings[variable.var] = { source, maxLength: variable.length };
    }
    onRule({ ...rule, patternCode: code, bindings });
    clearError(`${info.id}:pattern`);
  }

  function changeBinding(row: VariableRow, source: string) {
    const bindings = { ...rule.bindings };
    if (source) bindings[row.name] = { source: source as SmsEventVariable, maxLength: row.length };
    else delete bindings[row.name];
    onRule({ ...rule, bindings });
    clearError(`${info.id}:var:${row.name}`);
  }

  // Free-form text longer than the variable's declared length is cut before sending — say so up front.
  function hintFor(row: VariableRow) {
    const source = rule.bindings[row.name]?.source;
    if (source === "storeName" && row.length > 0 && storeName.length > row.length) return `نام فروشگاه (${storeName.length.toLocaleString("fa-IR")} نویسه) از طول این متغیر (${row.length.toLocaleString("fa-IR")}) بلندتر است و بریده می‌شود.`;
    if (source && smsEventVariables[source].kind === "text" && row.length > 0) return `حداکثر ${row.length.toLocaleString("fa-IR")} نویسه؛ بلندتر از آن بریده می‌شود.`;
    return undefined;
  }

  const patternOptions = patterns.status === "ready"
    ? [...(rule.patternCode && !pattern ? [{ value: rule.patternCode, label: `${rule.patternCode} — ذخیره‌شده، در حساب پیدا نشد` }] : []), ...patterns.patterns.map((item) => ({ value: item.code, label: patternLabel(item) }))]
    : rule.patternCode ? [{ value: rule.patternCode, label: `${rule.patternCode} — ذخیره‌شده` }] : [];

  return (
    <section className="bp-frame relative p-[16px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-[14px]">{info.label}</strong>
            <BpTag tone={info.audience === "ADMIN" ? "info" : "neutral"}>{info.audience === "ADMIN" ? "به مدیر" : "به مشتری"}</BpTag>
          </div>
          <p className="bp-muted m-0 mt-1 text-[12px]">{info.description}</p>
        </div>
        <BpSwitch isSelected={enabled} onChange={onEnabled}>{enabled ? "فعال" : "غیرفعال"}</BpSwitch>
      </div>

      {enabled && (
        <div className="mt-3 grid gap-3 border-t border-[var(--bp-divider)] pt-3">
          <div>
            <BpSeg label={`روش ارسال ${info.label}`} value={rule.mode} onChange={(mode) => onRule({ ...rule, mode })} options={[{ value: "PATTERN", label: "پترن (فوری)" }, { value: "TEXT", label: "متن ساده" }]} />
            <p className="bp-muted m-0 mt-2 text-[11px] leading-5">{rule.mode === "PATTERN" ? "با پترن تأییدشده‌ی فراز و بلافاصله ارسال می‌شود." : "فراز پیام‌های متنی را پیش از ارسال توسط اپراتور تأیید می‌کند؛ فوری نیست."}</p>
          </div>

          {rule.mode === "PATTERN" ? (
            <div className="grid gap-3">
              <BpSelect label="پترن" required placeholder={patterns.status === "loading" ? "در حال دریافت پترن‌ها…" : "انتخاب پترن…"} value={rule.patternCode} onChange={(event) => changePattern(event.target.value)} error={errors[`${info.id}:pattern`]} hint={patterns.status === "error" ? patterns.message : "پترن‌های حساب فراز شما"} disabled={patterns.status !== "ready" && patternOptions.length === 0} options={patternOptions} />
              {rows.map((row) => (
                <BpSelect
                  key={row.name}
                  label={<span>مقدار متغیر <bdo dir="ltr" className="font-mono">{row.name}</bdo></span>}
                  required
                  placeholder="انتخاب مقدار…"
                  value={rule.bindings[row.name]?.source ?? ""}
                  onChange={(event) => changeBinding(row, event.target.value)}
                  error={errors[`${info.id}:var:${row.name}`]}
                  hint={hintFor(row)}
                  options={allowed.map((variable) => ({ value: variable, label: smsEventVariables[variable].label }))}
                />
              ))}
              {pattern && pattern.vars.length === 0 && <p className="bp-muted m-0 text-[12px]">این پترن متغیری ندارد؛ متن ثابت آن ارسال می‌شود.</p>}
            </div>
          ) : (
            <div className="grid gap-2">
              <BpTextarea label="متن پیام" required rows={2} maxLength={communicationFieldLimits.template} value={template} onChange={(event) => { onTemplate(event.target.value); clearError(`${info.id}:template`); }} error={errors[`${info.id}:template`]} />
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="bp-muted">متغیرها:</span>
                {allowed.map((variable) => <bdo key={variable} dir="ltr" className={tokenClass} title={smsEventVariables[variable].label}>{`{${variable}}`}</bdo>)}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * One place to decide, for every automated message, whether it is sent and how: through a
 * registered Faraz pattern (with each pattern variable bound to an order value) or as plain text.
 */
export function BlueprintSmsEventsForm({ initialSettings, storeName, providerReady }: { initialSettings: CommunicationSettingsData; storeName: string; providerReady: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [flags, setFlags] = useState(() => Object.fromEntries(smsEventIds.map((id) => [id, initialSettings[smsEventFlagKey(id)]])) as Record<SmsEventId, boolean>);
  const [templates, setTemplates] = useState<Record<SmsEventId, string>>(initialSettings.templates);
  const [rules, setRules] = useState(() => Object.fromEntries(smsEventIds.map((id) => [id, smsEventRule(initialSettings.eventRules, id)])) as Record<SmsEventId, SmsEventRule>);
  const [patterns, setPatterns] = useState<Patterns>(providerReady ? { status: "loading" } : { status: "error", message: "برای انتخاب پترن، ابتدا فراز اس‌ام‌اس را پیکربندی و فعال کنید." });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

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

  const clearError = (key: string) => setErrors((current) => { if (!(key in current)) return current; const rest = { ...current }; delete rest[key]; return rest; });

  function validate() {
    const next: Errors = {};
    for (const info of smsEvents) {
      if (!flags[info.id]) continue;
      const rule = rules[info.id];
      if (rule.mode === "TEXT") {
        if (!templates[info.id].trim()) next[`${info.id}:template`] = "متن پیام را بنویسید.";
        continue;
      }
      if (!rule.patternCode) { next[`${info.id}:pattern`] = "پترن را انتخاب کنید."; continue; }
      const pattern = patterns.status === "ready" ? patterns.patterns.find((item) => item.code === rule.patternCode) : undefined;
      for (const variable of pattern?.vars ?? Object.keys(rule.bindings).map((name) => ({ var: name, type: "" }))) {
        const binding = rule.bindings[variable.var];
        if (!binding) next[`${info.id}:var:${variable.var}`] = "مقدار این متغیر را انتخاب کنید.";
        // A numeric variable rejects a name; a mismatch would only surface when a customer's SMS fails.
        else if (variable.type === "int" && smsEventVariables[binding.source].kind === "text") next[`${info.id}:var:${variable.var}`] = "این متغیر عددی است؛ مقدار متنی پذیرفته نمی‌شود.";
      }
    }
    return next;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate();
    if (Object.keys(found).length) {
      setErrors(found);
      // The first invalid control gets focus once React has rendered its `aria-invalid`.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setSaving(true);
    try {
      const body = { ...Object.fromEntries(smsEventIds.map((id) => [smsEventFlagKey(id), flags[id]])), templates, eventRules: rules };
      const response = await fetch("/api/admin/sms/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "تنظیمات ذخیره نشد.");
      toast.success("پیامک‌های رویدادها ذخیره شد");
    } catch (error) {
      toast.danger("ذخیره انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid gap-2">
      {!initialSettings.smsEnabled && (
        <div className="bp-frame relative flex items-start gap-3 border-[var(--bp-warning)] p-[14px]">
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[var(--bp-warning)]" />
          <div className="min-w-0 text-[12px] leading-6">
            <strong className="block text-[13px]">ارسال پیامک هنوز خاموش است</strong>
            تا کلید «ارسال پیامک فعال باشد» روشن نشود، هیچ‌کدام از این پیامک‌ها ارسال نمی‌شود.
            <Link href="/admin/settings/notifications/preferences" className="mt-1 block font-bold text-[var(--bp-accent)]">رفتن به تنظیمات پیامک و اعلان ←</Link>
          </div>
        </div>
      )}
      <div className="bp-frame relative flex items-start gap-3 p-[14px]">
        <Info size={16} className="bp-muted mt-1 shrink-0" />
        <p className="bp-muted m-0 text-[12px] leading-6">هر رویداد را روشن کنید و مشخص کنید چطور ارسال شود. پیامک با پترن فوری می‌رود؛ متن ساده اول باید توسط اپراتور فراز تأیید شود. برای پترن، هر متغیر را به یکی از مقدارهای سفارش وصل می‌کنید.
          {patterns.status === "loading" && <span className="mr-2 inline-flex items-center gap-1.5 align-middle"><BpSpinner size={12} />دریافت پترن‌ها…</span>}
          {" "}<Link href="/admin/settings/notifications/patterns" className="font-bold text-[var(--bp-accent)]">مدیریت پترن‌ها ←</Link>
        </p>
      </div>

      {smsEvents.map((info) => (
        <EventCard
          key={info.id}
          info={info}
          enabled={flags[info.id]}
          onEnabled={(value) => setFlags((current) => ({ ...current, [info.id]: value }))}
          template={templates[info.id]}
          onTemplate={(value) => setTemplates((current) => ({ ...current, [info.id]: value }))}
          rule={rules[info.id]}
          onRule={(rule) => setRules((current) => ({ ...current, [info.id]: rule }))}
          patterns={patterns}
          storeName={storeName}
          errors={errors}
          clearError={clearError}
        />
      ))}

      <section className="bp-frame relative flex justify-start p-[16px]">
        <BpButton type="submit" variant="primary" isPending={saving}>ذخیره پیامک‌های رویدادها</BpButton>
      </section>
    </form>
  );
}
