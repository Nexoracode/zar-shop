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
