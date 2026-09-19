"use client";

import { useState } from "react";
import { AdminDialog, AdminDialogButton } from "@/components/admin/admin-dialog";
import { communicationFieldLimits } from "@/modules/communications/limits";
import { guessEventVariable, previewPatternText, renderSmsTemplate, sampleEventValues, smsEventVariables, type SmsEventInfo, type SmsEventRule, type SmsEventVariable } from "@/modules/communications/sms-events";
import type { SmsPattern } from "@/modules/communications/sms-pattern-schemas";
import { BpButton, BpSeg, BpSelect, BpTextarea } from "./ui";

export type SmsEventPatterns = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; patterns: SmsPattern[] };
type VariableRow = { name: string; length: number; type: string };

function patternLabel(pattern: SmsPattern) {
  const text = pattern.text.length > 36 ? `${pattern.text.slice(0, 36)}…` : pattern.text;
  return `${text} (${pattern.code})`;
}

function Preview({ children }: { children: string }) {
  return (
    <div>
      <span className="bp-muted block text-[11px]">پیش‌نمایش با مقادیر نمونه</span>
      <p className="m-0 mt-1.5 whitespace-pre-line border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3 text-[12px] leading-6">{children}</p>
    </div>
  );
}

/**
 * One event's delivery settings: plain text, or a Faraz pattern with each of its variables bound
 * to an order value. Edits a draft and hands it back on save, so cancelling changes nothing.
 */
export function SmsEventDialog({ info, rule: initialRule, template: initialTemplate, patterns, storeName, isSaving, onSave, onClose }: {
  info: SmsEventInfo;
  rule: SmsEventRule;
  template: string;
  patterns: SmsEventPatterns;
  storeName: string;
  isSaving: boolean;
  onSave: (draft: { rule: SmsEventRule; template: string }) => void;
  onClose: () => void;
}) {
  const allowed: readonly SmsEventVariable[] = info.variables;
  const [rule, setRule] = useState(initialRule);
  const [template, setTemplate] = useState(initialTemplate);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const samples = sampleEventValues(storeName);

  const pattern = patterns.status === "ready" ? patterns.patterns.find((item) => item.code === rule.patternCode) : undefined;
  // The variables to map: the chosen pattern's own, or — when its list cannot be loaded — the ones already saved.
  const rows: VariableRow[] = pattern ? pattern.vars.map((variable) => ({ name: variable.var, length: variable.length, type: variable.type })) : Object.entries(rule.bindings).map(([name, binding]) => ({ name, length: binding.maxLength, type: "" }));
  const patternOptions = patterns.status === "ready"
    ? [...(rule.patternCode && !pattern ? [{ value: rule.patternCode, label: `${rule.patternCode} — در حساب پیدا نشد` }] : []), ...patterns.patterns.map((item) => ({ value: item.code, label: patternLabel(item) }))]
    : rule.patternCode ? [{ value: rule.patternCode, label: rule.patternCode }] : [];

  const clear = (key: string) => setErrors((current) => { if (!(key in current)) return current; const rest = { ...current }; delete rest[key]; return rest; });

  function changePattern(code: string) {
    const chosen = patterns.status === "ready" ? patterns.patterns.find((item) => item.code === code) : undefined;
    const bindings: SmsEventRule["bindings"] = {};
    for (const variable of chosen?.vars ?? []) {
      const source = guessEventVariable(variable.var, allowed);
      if (source) bindings[variable.var] = { source, maxLength: variable.length };
    }
    setRule({ ...rule, patternCode: code, bindings });
    clear("pattern");
  }

  function changeBinding(row: VariableRow, source: string) {
    const bindings = { ...rule.bindings };
    if (source) bindings[row.name] = { source: source as SmsEventVariable, maxLength: row.length };
    else delete bindings[row.name];
    setRule({ ...rule, bindings });
    clear(`var:${row.name}`);
  }

  // Free-form text longer than the variable's declared length is cut before sending — say so up front.
  function hintFor(row: VariableRow) {
    const source = rule.bindings[row.name]?.source;
    if (source === "storeName" && row.length > 0 && storeName.length > row.length) return `نام فروشگاه از ${row.length.toLocaleString("fa-IR")} نویسه بلندتر است و بریده می‌شود.`;
    if (source && smsEventVariables[source].kind === "text" && row.length > 0) return `حداکثر ${row.length.toLocaleString("fa-IR")} نویسه`;
    return undefined;
  }

  function save() {
    const found: Record<string, string> = {};
    if (rule.mode === "TEXT") {
      if (!template.trim()) found.template = "متن پیام را بنویسید.";
    } else if (!rule.patternCode) {
      found.pattern = "پترن را انتخاب کنید.";
    } else {
      for (const row of rows) {
        const binding = rule.bindings[row.name];
        if (!binding) found[`var:${row.name}`] = "مقدار را انتخاب کنید.";
        // A numeric variable rejects a name; a mismatch would only surface when a customer's SMS fails.
        else if (row.type === "int" && smsEventVariables[binding.source].kind === "text") found[`var:${row.name}`] = "این متغیر عددی است.";
      }
    }
    setErrors(found);
    if (Object.keys(found).length) return;
    onSave({ rule, template });
  }

  return (
    <AdminDialog
      open
      size="md"
      ariaLabel={`تنظیم پیامک ${info.label}`}
      isBusy={isSaving}
      onClose={onClose}
      title={info.label}
      description={info.description}
      actions={<>
        <AdminDialogButton variant="primary" isPending={isSaving} onPress={save}>ذخیره</AdminDialogButton>
        <AdminDialogButton variant="secondary" isDisabled={isSaving} onPress={onClose}>انصراف</AdminDialogButton>
      </>}
    >
      <div>
        <BpSeg label="روش ارسال" fullWidth value={rule.mode} onChange={(mode) => setRule({ ...rule, mode })} options={[{ value: "PATTERN", label: "پترن" }, { value: "TEXT", label: "متن ساده" }]} />
        <p className="bp-muted m-0 mt-2 text-[11px] leading-5">{rule.mode === "PATTERN" ? "ارسال فوری با پترن تأییدشده‌ی فراز." : "فراز پیام متنی را پیش از ارسال توسط اپراتور تأیید می‌کند؛ فوری نیست."}</p>
      </div>

      {rule.mode === "PATTERN" ? (
        <>
          <BpSelect label="پترن" required placeholder={patterns.status === "loading" ? "در حال دریافت پترن‌ها…" : "انتخاب پترن…"} value={rule.patternCode} onChange={(event) => changePattern(event.target.value)} error={errors.pattern} hint={patterns.status === "error" ? patterns.message : undefined} disabled={patterns.status !== "ready" && patternOptions.length === 0} options={patternOptions} />
          {rows.length > 0 && (
            <div className="grid gap-x-3 sm:grid-cols-2">
              {rows.map((row) => (
                <BpSelect
                  key={row.name}
                  label={<bdo dir="ltr" className="font-mono">{row.name}</bdo>}
                  required
                  placeholder="مقدار…"
                  value={rule.bindings[row.name]?.source ?? ""}
                  onChange={(event) => changeBinding(row, event.target.value)}
                  error={errors[`var:${row.name}`]}
                  hint={hintFor(row)}
                  options={allowed.map((variable) => ({ value: variable, label: smsEventVariables[variable].label }))}
                />
              ))}
            </div>
          )}
          {pattern && <Preview>{previewPatternText(pattern.text, rule.bindings, samples)}</Preview>}
        </>
      ) : (
        <>
          <div>
            <BpTextarea label="متن پیام" required rows={3} maxLength={communicationFieldLimits.template} value={template} onChange={(event) => { setTemplate(event.target.value); clear("template"); }} error={errors.template} />
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="bp-muted">متغیرها:</span>
              {allowed.map((variable) => (
                <BpButton key={variable} variant="secondary" size="sm" title={smsEventVariables[variable].label} onClick={() => setTemplate((current) => `${current}${current && !current.endsWith(" ") ? " " : ""}{${variable}}`.slice(0, communicationFieldLimits.template))} className="font-mono"><bdo dir="ltr">{`{${variable}}`}</bdo></BpButton>
              ))}
            </div>
          </div>
          {template.trim() && <Preview>{renderSmsTemplate(template, samples)}</Preview>}
        </>
      )}
    </AdminDialog>
  );
}
