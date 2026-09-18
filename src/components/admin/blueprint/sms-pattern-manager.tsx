"use client";

import { useEffect, useId, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { FileText, RefreshCw, SquarePen, Trash2 } from "lucide-react";
import { AdminEmptyState, AdminPanel } from "@/components/admin-ui";
import { AdminColumn, AdminColumnSettingsButton, AdminColumnVisibility } from "@/components/admin-column-visibility";
import { smsPatternCategories, type SmsPattern } from "@/modules/communications/sms-pattern-schemas";
import { smsPatternFieldLimits } from "@/modules/communications/limits";
import { BpButton, BpInput, BpKicker, BpSelect, BpSwitch, BpTable, BpTag, BpTd, BpTextarea, BpTh } from "./ui";

/*
 * Chips inside the pattern-text editor are plain DOM nodes created and mutated imperatively via
 * these helpers, never through React state — a contentEditable region's children must stay out
 * of React's own reconciliation, or the two fight over the same DOM nodes.
 */
const VARIABLE_TOKEN_SOURCE = `%([A-Za-z0-9_]{1,${smsPatternFieldLimits.variableName}})%`;

function buildChipNode(name: string): HTMLSpanElement {
  const chip = document.createElement("span");
  chip.className = "bp-tag bp-tag-accent bp-pattern-chip";
  chip.contentEditable = "false";
  chip.dataset.varChip = name;
  const label = document.createElement("bdi");
  label.dir = "ltr";
  label.className = "font-mono";
  label.textContent = name;
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.setAttribute("aria-label", `حذف متغیر ${name}`);
  removeButton.className = "grid h-3.5 w-3.5 place-items-center leading-none text-[var(--bp-muted)] hover:text-[var(--bp-danger)]";
  removeButton.textContent = "×";
  // Without this, the mousedown that precedes the click first collapses the editor's selection
  // into the contentEditable region, moving focus before the click handler ever runs.
  removeButton.addEventListener("mousedown", (event) => event.preventDefault());
  chip.append(label, removeButton);
  return chip;
}

function serializeEditor(root: HTMLElement): string {
  let output = "";
  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) output += node.textContent ?? "";
    else if (node instanceof HTMLElement && node.dataset.varChip) output += `%${node.dataset.varChip}%`;
  });
  return output;
}

/** Splits one text node into [text?, chip, text?, chip, ..., trailing text] wherever a complete
 * `%var%` token appears, and returns the trailing text node so the caret can be restored there. */
function convertTextNode(textNode: Text): Text | null {
  // A chip's own label renders literal "name" text (e.g. inside its <bdi>) — without this guard,
  // re-scanning the whole editor on blur/paste/mount would match that label text too and nest a
  // brand-new chip inside the existing one, one layer deeper on every pass.
  if (textNode.parentElement?.closest("[data-var-chip]")) return null;
  const text = textNode.textContent ?? "";
  const pattern = new RegExp(VARIABLE_TOKEN_SOURCE, "g");
  if (!pattern.test(text)) return null;
  pattern.lastIndex = 0;
  const parent = textNode.parentNode;
  if (!parent) return null;
  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    fragment.appendChild(buildChipNode(match[1]));
    lastIndex = match.index + match[0].length;
  }
  const trailing = document.createTextNode(text.slice(lastIndex));
  fragment.appendChild(trailing);
  parent.replaceChild(fragment, textNode);
  return trailing;
}

function convertAllTextNodes(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) { nodes.push(current as Text); current = walker.nextNode(); }
  for (const node of nodes) convertTextNode(node);
}

/** The variable names currently present as chips, in reading order — the single source of truth
 * the variables table below is derived from, so adding/removing a chip adds/removes its row. */
function collectVariableNames(root: HTMLElement): string[] {
  const seen = new Set<string>();
  root.querySelectorAll<HTMLElement>("[data-var-chip]").forEach((chip) => { if (chip.dataset.varChip) seen.add(chip.dataset.varChip); });
  return [...seen];
}

function placeCaretAtEnd(node: Node) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function insertPlainText(root: HTMLElement, text: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !root.contains(selection.getRangeAt(0).commonAncestorContainer)) {
    root.appendChild(document.createTextNode(text));
    return;
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.setEndAfter(node);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Free-text editor for SMS pattern content: typing `%name%` followed by a space turns it into a
 * removable chip in place, and pasted or pre-existing `%name%` tokens are chipped on paste/mount.
 * Deliberately not a shared `blueprint/ui` control — the `%var%` chip convention only exists for
 * this one field, unlike the generic text/select/switch controls that rule requires everywhere.
 */
function PatternTextEditor({ initialValue, maxLength, onChange, onVariablesChanged }: {
  initialValue: string;
  maxLength: number;
  onChange: (value: string) => void;
  onVariablesChanged: (names: string[]) => void;
}) {
  const fieldId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const onVariablesChangedRef = useRef(onVariablesChanged);
  const [length, setLength] = useState(initialValue.length);

  // Keeps the refs current after every render (never during it, which the lint rules below
  // disallow) so the DOM event handlers below always call the latest callback without needing
  // `onChange`/`onVariablesChanged` in their own dependency arrays.
  useEffect(() => {
    onChangeRef.current = onChange;
    onVariablesChangedRef.current = onVariablesChanged;
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.textContent = initialValue;
    convertAllTextNodes(root);
    setLength(serializeEditor(root).length);
    onVariablesChangedRef.current(collectVariableNames(root));
    // Runs once to seed the editor from the initial pattern text; the DOM is the source of
    // truth afterward, so this must not re-run when `initialValue` changes by reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emitChange() {
    const root = rootRef.current;
    if (!root) return;
    const value = serializeEditor(root);
    setLength(value.length);
    onChangeRef.current(value);
    onVariablesChangedRef.current(collectVariableNames(root));
  }

  function handleInput(event: FormEvent<HTMLDivElement>) {
    const root = rootRef.current;
    const native = event.nativeEvent as InputEvent;
    if (root && native.data === " ") {
      const anchor = window.getSelection()?.anchorNode;
      if (anchor && anchor.nodeType === Node.TEXT_NODE && root.contains(anchor)) {
        const trailing = convertTextNode(anchor as Text);
        if (trailing) placeCaretAtEnd(trailing);
      }
    }
    emitChange();
  }

  function handleBeforeInput(event: FormEvent<HTMLDivElement>) {
    const native = event.nativeEvent as InputEvent;
    if (native.inputType !== "insertText" && native.inputType !== "insertCompositionText") return;
    const incoming = native.data?.length ?? 0;
    const root = rootRef.current;
    if (!incoming || !root) return;
    if (serializeEditor(root).length + incoming > maxLength) event.preventDefault();
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const root = rootRef.current;
    if (!root) return;
    const remaining = maxLength - serializeEditor(root).length;
    if (remaining <= 0) return;
    insertPlainText(root, event.clipboardData.getData("text/plain").slice(0, remaining));
    convertAllTextNodes(root);
    emitChange();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const root = rootRef.current;
    if (!root) return;
    if (event.key === "Enter") {
      event.preventDefault();
      if (serializeEditor(root).length < maxLength) { insertPlainText(root, "\n"); emitChange(); }
      return;
    }
    if (event.key === "Backspace") {
      const selection = window.getSelection();
      if (!selection || !selection.isCollapsed || !selection.anchorNode || selection.anchorOffset !== 0) return;
      const anchor = selection.anchorNode;
      const previous = anchor.nodeType === Node.TEXT_NODE ? anchor.previousSibling : anchor.childNodes[selection.anchorOffset - 1] ?? null;
      if (previous instanceof HTMLElement && previous.dataset.varChip) { event.preventDefault(); previous.remove(); emitChange(); }
    }
  }

  function handleBlur() {
    const root = rootRef.current;
    if (!root) return;
    convertAllTextNodes(root);
    emitChange();
  }

  function handleChipClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const button = target.closest("button");
    const chip = button?.closest<HTMLElement>("[data-var-chip]");
    if (!button || !chip) return;
    event.preventDefault();
    chip.remove();
    emitChange();
  }

  const remaining = maxLength - length;
  const showCounter = remaining <= Math.min(50, Math.floor(maxLength / 4));

  return (
    <div className="bp-field">
      <label htmlFor={fieldId}>متن پترن<span aria-hidden className="text-[var(--bp-danger)]"> *</span></label>
      <div
        id={fieldId}
        ref={rootRef}
        role="textbox"
        aria-multiline="true"
        contentEditable
        dir="rtl"
        suppressContentEditableWarning
        data-placeholder="مثلا: کد تأیید شما: %otp% است"
        className="bp-input bp-pattern-editor"
        onInput={handleInput}
        onBeforeInput={handleBeforeInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onClick={handleChipClick}
      />
      <span className="flex items-start justify-between gap-2">
        <span className="bp-field-message bp-field-message-hint">هر متغیر را با %نام% بنویسید و یک فاصله بزنید تا به چیپ قابل‌حذف تبدیل شود</span>
        {showCounter && <span aria-live="polite" className={`bp-field-message shrink-0 ${remaining <= 0 ? "bp-field-message-error" : "bp-field-message-hint"}`}>{remaining.toLocaleString("fa-IR")} نویسه باقی مانده</span>}
      </span>
    </div>
  );
}

function statusTone(status: string | null) {
  if (!status) return "neutral" as const;
  const normalized = status.toLowerCase();
  if (normalized.includes("accept") || normalized.includes("approve") || normalized === "active") return "success" as const;
  if (normalized.includes("reject") || normalized.includes("fail")) return "danger" as const;
  return "warning" as const;
}
function statusLabel(status: string | null) {
  if (!status) return "نامشخص";
  const normalized = status.toLowerCase();
  if (normalized.includes("accept") || normalized.includes("approve") || normalized === "active") return "تأییدشده";
  if (normalized.includes("reject")) return "ردشده";
  if (normalized.includes("pending") || normalized.includes("wait")) return "در انتظار تأیید";
  return status;
}
function categoryLabel(category: number | null) {
  return smsPatternCategories.find((item) => item.value === category)?.label ?? "—";
}

const SMS_PATTERNS_TABLE_ID = "smsPatterns";

const smsPatternColumns = [
  { id: "text", label: "متن پترن" },
  { id: "code", label: "کد" },
  { id: "category", label: "دسته" },
  { id: "vars", label: "متغیرها" },
  { id: "status", label: "وضعیت" },
];

export function BlueprintSmsPatternList({ initialPatterns, initialHiddenColumns }: { initialPatterns: SmsPattern[]; initialHiddenColumns: string[] }) {
  const router = useRouter();
  const [patterns, setPatterns] = useState(initialPatterns);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    setBusy("refresh");
    try {
      const response = await fetch("/api/admin/sms/patterns");
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "دریافت پترن‌ها انجام نشد.");
      setPatterns(result);
    } catch (error) {
      toast.danger("بروزرسانی انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally { setBusy(null); }
  }

  async function remove(code: string) {
    if (!window.confirm("این پترن برای همیشه از حساب فراز اس‌ام‌اس حذف می‌شود. ادامه می‌دهید؟")) return;
    setBusy(`delete-${code}`);
    try {
      const response = await fetch(`/api/admin/sms/patterns/${encodeURIComponent(code)}`, { method: "DELETE" });
      if (!response.ok) { const result = await response.json().catch(() => null); throw new Error(result?.message ?? "حذف پترن انجام نشد."); }
      setPatterns((current) => current.filter((item) => item.code !== code));
      toast.success("پترن حذف شد");
    } catch (error) {
      toast.danger("حذف انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally { setBusy(null); }
  }

  return (
    <AdminColumnVisibility tableId={SMS_PATTERNS_TABLE_ID} columns={smsPatternColumns} initialHidden={initialHiddenColumns}>
      <AdminPanel>
        <div className="flex items-center justify-between gap-3 border-b border-[var(--bp-row-line)] p-[14px]">
          <p className="bp-muted m-0 text-[12px]">پترن‌های ثبت‌شده در حساب فراز اس‌ام‌اس شما؛ ساخت پترن جدید تا تأیید اپراتور چند دقیقه زمان می‌برد.</p>
          <div className="flex items-center gap-2">
            <AdminColumnSettingsButton />
            <BpButton type="button" variant="secondary" size="sm" isPending={busy === "refresh"} onClick={() => void refresh()} className="gap-2"><RefreshCw size={14} />بروزرسانی</BpButton>
          </div>
        </div>
        {patterns.length ? (
          <>
            <div className="md:hidden">
              {patterns.map((item) => (
                <article key={item.code} className="border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center border border-[var(--bp-accent)] bg-[var(--bp-accent-100)] text-[var(--bp-accent)]"><FileText size={17} /></span>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-[13px]">{item.text || item.code}</strong>
                      <span className="bp-muted block truncate font-mono text-[11px]" dir="ltr">{item.code}</span>
                    </div>
                    <BpTag tone={statusTone(item.status)}>{statusLabel(item.status)}</BpTag>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <BpButton type="button" variant="secondary" onClick={() => router.push(`/admin/settings/notifications/patterns/${encodeURIComponent(item.code)}/edit`)} className="gap-2"><SquarePen size={14} />ویرایش</BpButton>
                    <BpButton type="button" variant="danger" isPending={busy === `delete-${item.code}`} onClick={() => void remove(item.code)} className="gap-2"><Trash2 size={14} />حذف</BpButton>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden md:block">
              <BpTable ariaLabel="پترن‌های پیامک" minWidth={860}>
                <thead>
                  <tr>
                    <AdminColumn id="text"><BpTh>متن پترن</BpTh></AdminColumn>
                    <AdminColumn id="code"><BpTh>کد</BpTh></AdminColumn>
                    <AdminColumn id="category"><BpTh>دسته</BpTh></AdminColumn>
                    <AdminColumn id="vars"><BpTh>متغیرها</BpTh></AdminColumn>
                    <AdminColumn id="status"><BpTh>وضعیت</BpTh></AdminColumn>
                    <BpTh className="text-center">عملیات</BpTh>
                  </tr>
                </thead>
                <tbody>
                  {patterns.map((item) => (
                    <tr key={item.code}>
                      <AdminColumn id="text"><BpTd className="max-w-72 truncate font-bold">{item.text}</BpTd></AdminColumn>
                      <AdminColumn id="code"><BpTd className="bp-muted font-mono" dir="ltr">{item.code}</BpTd></AdminColumn>
                      <AdminColumn id="category"><BpTd className="bp-muted">{categoryLabel(item.category)}</BpTd></AdminColumn>
                      <AdminColumn id="vars"><BpTd className="bp-muted font-mono" dir="ltr">{item.vars.map((variable) => variable.var).join(", ") || "—"}</BpTd></AdminColumn>
                      <AdminColumn id="status"><BpTd><BpTag tone={statusTone(item.status)}>{statusLabel(item.status)}</BpTag></BpTd></AdminColumn>
                      <BpTd className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <BpButton type="button" variant="ghost" isIconOnly size="sm" aria-label={`ویرایش پترن ${item.code}`} onClick={() => router.push(`/admin/settings/notifications/patterns/${encodeURIComponent(item.code)}/edit`)}><SquarePen size={15} strokeWidth={1.5} /></BpButton>
                          <BpButton type="button" variant="ghost" className="bp-btn-danger-icon" isIconOnly size="sm" isPending={busy === `delete-${item.code}`} aria-label={`حذف پترن ${item.code}`} onClick={() => void remove(item.code)}><Trash2 size={15} strokeWidth={1.5} /></BpButton>
                        </div>
                      </BpTd>
                    </tr>
                  ))}
                </tbody>
              </BpTable>
            </div>
          </>
        ) : <AdminEmptyState title="پترنی ثبت نشده" description="هنوز هیچ پترنی در حساب فراز اس‌ام‌اس ثبت نشده است." />}
      </AdminPanel>
    </AdminColumnVisibility>
  );
}

type PatternVariable = { var: string; length: string; type: "string" | "int" };

// A pattern created here only ever serves this store's OTP flow, so the category Faraz's create
// API requires is fixed rather than asked of the admin.
const OTP_PATTERN_CATEGORY = 1;

export function BlueprintSmsPatternForm({ pattern }: { pattern?: SmsPattern }) {
  const router = useRouter();
  const isEdit = Boolean(pattern);
  const [text, setText] = useState(pattern?.text ?? "");
  const [description, setDescription] = useState(pattern?.description ?? "");
  const [website, setWebsite] = useState(pattern?.website ?? "");
  const [shared, setShared] = useState(pattern?.shared ?? false);
  const [vars, setVars] = useState<PatternVariable[]>(pattern?.vars.map((item) => ({ var: item.var, length: String(item.length || 20), type: item.type === "int" ? "int" : "string" })) ?? []);
  const [busy, setBusy] = useState(false);

  function updateVariable(name: string, patch: Partial<Pick<PatternVariable, "length" | "type">>) {
    setVars((current) => current.map((item) => item.var === name ? { ...item, ...patch } : item));
  }

  // The table is a pure reflection of the chips typed into the text above: a variable that
  // appears there gets a row (keeping its length/type if it already had one), and a variable
  // that's no longer there loses its row — no manual add/remove for this table itself.
  function handleVariablesChanged(names: string[]) {
    setVars((current) => {
      const byName = new Map(current.map((item) => [item.var, item]));
      return names.map((name) => byName.get(name) ?? { var: name, length: "20", type: "string" });
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const body = { text, description: description || undefined, shared, website, category: OTP_PATTERN_CATEGORY, vars: vars.map((item) => ({ var: item.var, length: Number(item.length) || 20, type: item.type })) };
      const response = await fetch(isEdit ? `/api/admin/sms/patterns/${encodeURIComponent(pattern!.code)}` : "/api/admin/sms/patterns", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره پترن انجام نشد.");
      toast.success(isEdit ? "پترن ویرایش شد" : "پترن ثبت شد", { description: isEdit ? undefined : "تا تأیید اپراتور، پترن قابل استفاده برای ارسال نخواهد بود." });
      router.push("/admin/settings/notifications/patterns");
      router.refresh();
    } catch (error) {
      toast.danger("ذخیره انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>محتوای پترن</BpKicker>
        <div className="mt-3 grid gap-3">
          <PatternTextEditor initialValue={pattern?.text ?? ""} maxLength={smsPatternFieldLimits.text} onChange={setText} onVariablesChanged={handleVariablesChanged} />
          <BpTextarea label="توضیحات" rows={2} maxLength={smsPatternFieldLimits.description} value={description} onChange={(event) => setDescription(event.target.value)} />
          <BpInput label="دامنه وب‌سایت" hint="دامنه فروشگاه، بدون https و www" required dir="ltr" maxLength={smsPatternFieldLimits.website} value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="example.com" />
          <BpSwitch isSelected={shared} onChange={setShared}>اشتراک‌گذاری پترن با سایر کاربران فراز اس‌ام‌اس</BpSwitch>
        </div>
      </section>

      <section className="bp-frame relative p-[16px]">
        <BpKicker>متغیرها</BpKicker>
        {vars.length ? (
          <div className="mt-3 grid gap-2">
            {vars.map((variable) => (
              <div key={variable.var} className="grid grid-cols-2 items-center gap-2 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-2.5 sm:grid-cols-[auto_100px_120px]">
                <BpTag tone="accent"><bdi dir="ltr" className="font-mono">{variable.var}</bdi></BpTag>
                <BpInput aria-label={`حداکثر طول متغیر ${variable.var}`} required type="number" min={1} max={500} dir="ltr" value={variable.length} onChange={(event) => updateVariable(variable.var, { length: event.target.value })} reserveMessage={false} />
                <BpSelect aria-label={`نوع متغیر ${variable.var}`} value={variable.type} onChange={(event) => updateVariable(variable.var, { type: event.target.value as "string" | "int" })} options={[{ value: "string", label: "متن" }, { value: "int", label: "عدد" }]} reserveMessage={false} />
              </div>
            ))}
          </div>
        ) : <p className="bp-muted m-0 mt-2 text-[12px] leading-6">با نوشتن %نام% در متن پترن بالا، متغیر اینجا اضافه می‌شود؛ نام متغیر دلخواه است و بعداً هنگام تنظیم این پترن به‌عنوان پترن OTP در ارائه‌دهنده پیامک مشخص می‌کنید کدام متغیر کد تأیید است.</p>}
      </section>

      <div className="flex items-center gap-2">
        <BpButton type="submit" variant="primary" isPending={busy}>{isEdit ? "ذخیره تغییرات" : "ثبت پترن"}</BpButton>
        <BpButton type="button" variant="secondary" onClick={() => router.push("/admin/settings/notifications/patterns")}>انصراف</BpButton>
      </div>
    </form>
  );
}
