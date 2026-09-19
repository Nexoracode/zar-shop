import { z } from "zod";
import { smsPatternFieldLimits, smsProviderFieldLimits } from "@/modules/communications/limits";

/*
 * The automated SMS events and the values each one can fill in. Pure (no `db`), so the admin form
 * and the sending code read one catalog: which events exist, who receives them, and which
 * variables a text template or a Faraz pattern may use for that event.
 */

/**
 * `text` values are free-form (a name) and get cut to a pattern variable's declared length — Faraz
 * holds a message for human approval when a value is longer than that. `value` values (numbers,
 * codes) are never cut: a truncated order number would be wrong, not just short.
 */
export const smsEventVariables = {
  orderNumber: { label: "شماره سفارش", kind: "value", sample: "ZG-10245" },
  customerName: { label: "نام مشتری", kind: "text", sample: "علی رضایی" },
  totalAmount: { label: "مبلغ سفارش (فقط رقم)", kind: "value", sample: "2500000" },
  trackingNumber: { label: "کد رهگیری", kind: "value", sample: "24012345678" },
  storeName: { label: "نام فروشگاه", kind: "text", sample: "فروشگاه" },
  productName: { label: "نام محصول", kind: "text", sample: "محصول نمونه" },
  stock: { label: "موجودی", kind: "value", sample: "2" },
} as const;
export type SmsEventVariable = keyof typeof smsEventVariables;
const variableKeys = Object.keys(smsEventVariables) as [SmsEventVariable, ...SmsEventVariable[]];

const orderVariables: readonly SmsEventVariable[] = ["orderNumber", "customerName", "totalAmount", "storeName"];

export const smsEvents = [
  { id: "orderCreated", label: "ثبت سفارش", description: "بعد از ثبت سفارش و پیش از پرداخت", audience: "CUSTOMER", variables: orderVariables },
  { id: "paymentSuccess", label: "پرداخت موفق", description: "وقتی پرداخت سفارش تأیید شد", audience: "CUSTOMER", variables: orderVariables },
  { id: "orderProcessing", label: "در حال آماده‌سازی", description: "وقتی وضعیت سفارش به «در حال آماده‌سازی» می‌رود", audience: "CUSTOMER", variables: orderVariables },
  { id: "orderShipped", label: "ارسال سفارش", description: "وقتی سفارش تحویل شرکت حمل شد", audience: "CUSTOMER", variables: [...orderVariables, "trackingNumber"] },
  { id: "orderDelivered", label: "تحویل سفارش", description: "وقتی سفارش به مشتری تحویل داده شد", audience: "CUSTOMER", variables: orderVariables },
  { id: "orderExpired", label: "انقضای سفارش", description: "وقتی مهلت پرداخت سفارش تمام شد", audience: "CUSTOMER", variables: orderVariables },
  { id: "orderCancelled", label: "لغو سفارش", description: "وقتی سفارش لغو شد", audience: "CUSTOMER", variables: orderVariables },
  { id: "orderRefunded", label: "بازگشت وجه سفارش", description: "وقتی سفارش به وضعیت «بازگشت وجه» رفت", audience: "CUSTOMER", variables: orderVariables },
  { id: "lowStockAdmin", label: "هشدار موجودی کم", description: "به شماره‌ی مدیر، وقتی موجودی محصولی کم شد", audience: "ADMIN", variables: ["productName", "stock", "storeName"] },
] as const satisfies readonly { id: string; label: string; description: string; audience: "CUSTOMER" | "ADMIN"; variables: readonly SmsEventVariable[] }[];

export type SmsEventId = (typeof smsEvents)[number]["id"];
export type SmsEventInfo = (typeof smsEvents)[number];
export const smsEventIds = smsEvents.map((event) => event.id) as [SmsEventId, ...SmsEventId[]];
export const smsEventIdSchema = z.enum(smsEventIds);

export function smsEventInfo(id: SmsEventId): SmsEventInfo {
  return smsEvents.find((event) => event.id === id)!;
}

/** The on/off column of an event on `CommunicationSetting` — every event follows the same naming. */
export function smsEventFlagKey(id: SmsEventId): `${SmsEventId}Sms` {
  return `${id}Sms`;
}

const patternBindingSchema = z.object({
  source: z.enum(variableKeys),
  /** The variable's length as declared on Faraz's pattern when it was mapped; 0 when unknown. */
  maxLength: z.number().int().min(0).max(smsPatternFieldLimits.text),
});
export type SmsPatternBinding = z.infer<typeof patternBindingSchema>;

export const smsEventRuleSchema = z.object({
  mode: z.enum(["TEXT", "PATTERN"]),
  patternCode: z.string().trim().max(smsProviderFieldLimits.otpPatternCode),
  /** Pattern variable name → the event value that fills it. */
  bindings: z.record(z.string().min(1).max(smsPatternFieldLimits.variableName), patternBindingSchema),
});
export type SmsEventRule = z.infer<typeof smsEventRuleSchema>;

export const defaultSmsEventRule: SmsEventRule = { mode: "TEXT", patternCode: "", bindings: {} };

export const smsEventRulesSchema = z
  .object(Object.fromEntries(smsEventIds.map((id) => [id, smsEventRuleSchema.optional()])) as Record<SmsEventId, z.ZodOptional<typeof smsEventRuleSchema>>)
  .superRefine((rules, context) => {
    for (const id of smsEventIds) {
      const rule = rules[id];
      if (!rule || rule.mode !== "PATTERN") continue;
      if (!rule.patternCode) context.addIssue({ code: "custom", path: [id, "patternCode"], message: "پترن را انتخاب کنید." });
      const allowed: readonly SmsEventVariable[] = smsEventInfo(id).variables;
      for (const [variable, binding] of Object.entries(rule.bindings)) {
        if (!allowed.includes(binding.source)) context.addIssue({ code: "custom", path: [id, "bindings", variable], message: `«${smsEventVariables[binding.source].label}» برای این رویداد در دسترس نیست.` });
      }
    }
  });
export type SmsEventRules = z.infer<typeof smsEventRulesSchema>;

export function smsEventRule(rules: SmsEventRules, id: SmsEventId): SmsEventRule {
  return rules[id] ?? defaultSmsEventRule;
}

/** Fills `{orderNumber}`-style tokens in a text template; a token with no value is left as written. */
export function renderSmsTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{([A-Za-z]+)\}/g, (token, key: string) => key in values ? values[key] : token);
}

/**
 * The `attributes` a pattern send needs: each pattern variable gets the value bound to it. An
 * empty value becomes "-" (Faraz has no way to send a blank), and free-form text is cut to the
 * length the pattern declared for that variable so Faraz does not hold the message for approval.
 */
export function buildPatternAttributes(bindings: SmsEventRule["bindings"], values: Record<string, string>) {
  const attributes: Record<string, string> = {};
  for (const [name, binding] of Object.entries(bindings)) {
    let value = values[binding.source]?.trim() || "-";
    if (smsEventVariables[binding.source].kind === "text" && binding.maxLength > 0) value = value.slice(0, binding.maxLength);
    attributes[name] = value;
  }
  return attributes;
}

/**
 * Best guess at which event value a pattern variable stands for, from its name — so most patterns
 * map themselves. Returns null when nothing in `allowed` fits; the admin then picks by hand.
 */
export function guessEventVariable(variableName: string, allowed: readonly SmsEventVariable[]): SmsEventVariable | null {
  const name = variableName.toLowerCase();
  const rules: [SmsEventVariable, RegExp][] = [
    ["storeName", /store|shop|brand|فروشگاه/],
    ["trackingNumber", /track|rahgiri|post|رهگیری|مرسوله/],
    ["totalAmount", /amount|price|total|sum|مبلغ|قیمت/],
    ["orderNumber", /order|number|num|no$|سفارش|شماره/],
    ["productName", /product|item|محصول|کالا/],
    ["stock", /stock|inventory|موجودی/],
    ["customerName", /name|customer|user|client|نام|مشتری/],
  ];
  return rules.find(([variable, pattern]) => allowed.includes(variable) && pattern.test(name))?.[0] ?? null;
}

/** Example values for the admin's preview; the store name is the real one. */
export function sampleEventValues(storeName: string): Record<SmsEventVariable, string> {
  return Object.fromEntries(variableKeys.map((key) => [key, key === "storeName" && storeName ? storeName : smsEventVariables[key].sample])) as Record<SmsEventVariable, string>;
}

/** A pattern's text with each `%variable%` replaced by the sample of the value bound to it. */
export function previewPatternText(text: string, bindings: SmsEventRule["bindings"], samples: Record<string, string>) {
  return text.replace(/%([^%\s]+)%/g, (token, name: string) => { const binding = bindings[name]; return binding ? samples[binding.source] ?? token : token; });
}
