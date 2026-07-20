export function formatMoney(value: number | string) {
  return `${Number(value).toLocaleString("fa-IR")} ریال`;
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(value));
}
