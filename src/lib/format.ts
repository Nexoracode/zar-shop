export function formatMoney(value: number | string, currency: "IRR" | "IRT" = "IRR") {
  const amount = currency === "IRT" ? Number(value) / 10 : Number(value);
  return `${amount.toLocaleString("fa-IR", { maximumFractionDigits: 0 })} ${currency === "IRT" ? "تومان" : "ریال"}`;
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(value));
}

export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** Clock-only time, for message-bubble timestamps where the day is already shown by a separator. */
export function formatTimeFa(value: Date | string) {
  return new Intl.DateTimeFormat("fa-IR", { timeStyle: "short" }).format(new Date(value));
}

/** Day-grouping label for chat-style timelines: "امروز" / "دیروز" / an absolute date otherwise. */
export function formatDayLabel(value: Date | string) {
  const date = new Date(value);
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  if (diffDays === 0) return "امروز";
  if (diffDays === 1) return "دیروز";
  return formatDate(date);
}

/** Short Persian "x ago" — falls back to an absolute date past a week. */
export function formatRelativeFa(value: Date | string) {
  const then = new Date(value).getTime();
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "همین حالا";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes.toLocaleString("fa-IR")} دقیقه پیش`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours.toLocaleString("fa-IR")} ساعت پیش`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days.toLocaleString("fa-IR")} روز پیش`;
  return formatDate(value);
}
