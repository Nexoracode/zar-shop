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
