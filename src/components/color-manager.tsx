"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, Input, toast } from "@heroui/react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { apiErrorMessage } from "@/lib/form-errors";

type ColorItem = { id: string; name: string; hex: string; isActive: boolean; sortOrder: number };

export function ColorManager({ initialColors }: { initialColors: ColorItem[] }) {
  const [colors, setColors] = useState(initialColors);
  const [editing, setEditing] = useState<ColorItem | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = { name: String(form.get("name") ?? ""), hex: String(form.get("hex") ?? "").toUpperCase(), sortOrder: Number(form.get("sortOrder")), isActive: form.get("isActive") === "on" };
    try {
      const response = await fetch(editing ? `/api/colors/${editing.id}` : "/api/colors", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(result, "ذخیره رنگ انجام نشد.", { name: "نام رنگ", hex: "کد رنگ", sortOrder: "ترتیب نمایش" }));
      setColors((current) => [...current.filter((item) => item.id !== result.id), result].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "fa")));
      setEditing(null); formElement.reset(); toast.success("رنگ ذخیره شد");
    } catch (reason) { toast.danger("ذخیره رنگ انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" }); }
    finally { setLoading(false); }
  }

  async function remove(color: ColorItem) {
    if (!window.confirm(`رنگ «${color.name}» حذف شود؟`)) return;
    const response = await fetch(`/api/colors/${color.id}`, { method: "DELETE" });
    if (!response.ok) return toast.danger("حذف رنگ انجام نشد");
    setColors((current) => current.filter((item) => item.id !== color.id));
    if (editing?.id === color.id) setEditing(null);
    toast.success("رنگ حذف شد");
  }

  return <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
    <Card variant="secondary" className="rounded-2xl border border-slate-200 bg-white"><Card.Content className="p-5">
      <div className="mb-5 flex items-center justify-between"><strong>{editing ? "ویرایش رنگ" : "رنگ جدید"}</strong>{editing && <Button isIconOnly variant="ghost" onPress={() => setEditing(null)} aria-label="انصراف"><X size={17} /></Button>}</div>
      <form key={editing?.id ?? "new"} onSubmit={submit} className="grid gap-4">
        <label className={adminLabelClass}>نام رنگ<Input name="name" required minLength={2} defaultValue={editing?.name} fullWidth variant="secondary" className={adminFieldClass} placeholder="مثلاً رزگلد" /></label>
        <label className={adminLabelClass}>کد رنگ<div className="flex items-center gap-2"><Input name="hex" required dir="ltr" pattern="#[0-9a-fA-F]{6}" defaultValue={editing?.hex ?? "#C9A56A"} fullWidth variant="secondary" className={adminFieldClass} /><input type="color" name="picker" defaultValue={editing?.hex ?? "#C9A56A"} onInput={(event) => { const input = event.currentTarget.form?.elements.namedItem("hex") as HTMLInputElement | null; if (input) input.value = event.currentTarget.value.toUpperCase(); }} className="h-11 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" /></div></label>
        <label className={adminLabelClass}>ترتیب نمایش<Input name="sortOrder" type="number" min="0" defaultValue={editing?.sortOrder ?? 0} fullWidth variant="secondary" className={adminFieldClass} /></label>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input name="isActive" type="checkbox" defaultChecked={editing?.isActive ?? true} />فعال</label>
        <Button type="submit" isDisabled={loading} variant="primary" className="min-h-11 gap-2 bg-[#172b4d] text-white">{editing ? <Save size={16} /> : <Plus size={16} />}{editing ? "ذخیره تغییرات" : "افزودن رنگ"}</Button>
      </form>
    </Card.Content></Card>
    <div className="grid gap-3">{colors.map((color) => <Card key={color.id} variant="secondary" className="rounded-2xl border border-slate-200 bg-white"><Card.Content className="flex items-center gap-3 p-4"><span className="h-11 w-11 shrink-0 rounded-full border-4 border-white shadow ring-1 ring-slate-200" style={{ backgroundColor: color.hex }} /><div className="min-w-0 flex-1"><strong className="block text-sm text-slate-800">{color.name}</strong><span className="text-xs text-slate-400" dir="ltr">{color.hex} · {color.isActive ? "فعال" : "غیرفعال"}</span></div><Button isIconOnly variant="ghost" onPress={() => setEditing(color)} aria-label={`ویرایش ${color.name}`}><Pencil size={16} /></Button><Button isIconOnly variant="danger-soft" onPress={() => void remove(color)} aria-label={`حذف ${color.name}`}><Trash2 size={16} /></Button></Card.Content></Card>)}{!colors.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">هنوز رنگی ثبت نشده است.</div>}</div>
  </div>;
}
