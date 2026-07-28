"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, ColorArea, ColorField, ColorPicker, ColorSlider, ColorSwatch, Input, Label, Modal, parseColor, toast } from "@heroui/react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { apiErrorMessage } from "@/lib/form-errors";

type ColorItem = { id: string; name: string; hex: string; isActive: boolean; sortOrder: number };

export function ColorManager({ initialColors }: { initialColors: ColorItem[] }) {
  const [colors, setColors] = useState(initialColors);
  const [editing, setEditing] = useState<ColorItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ColorItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [draftColor, setDraftColor] = useState(() => parseColor("#C9A56A"));

  function startEditing(color: ColorItem) {
    setEditing(color);
    setDraftColor(parseColor(color.hex));
  }

  function stopEditing() {
    setEditing(null);
    setDraftColor(parseColor("#C9A56A"));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = { name: String(form.get("name") ?? ""), hex: draftColor.toString("hex").toUpperCase(), sortOrder: Number(form.get("sortOrder")), isActive: form.get("isActive") === "on" };
    try {
      const response = await fetch(editing ? `/api/colors/${editing.id}` : "/api/colors", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(result, "ذخیره رنگ انجام نشد.", { name: "نام رنگ", hex: "کد رنگ", sortOrder: "ترتیب نمایش" }));
      setColors((current) => [...current.filter((item) => item.id !== result.id), result].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "fa")));
      stopEditing(); formElement.reset(); toast.success("رنگ ذخیره شد");
    } catch (reason) { toast.danger("ذخیره رنگ انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" }); }
    finally { setLoading(false); }
  }

  async function remove(color: ColorItem) {
    const response = await fetch(`/api/colors/${color.id}`, { method: "DELETE" });
    if (!response.ok) return toast.danger("حذف رنگ انجام نشد");
    setColors((current) => current.filter((item) => item.id !== color.id));
    if (editing?.id === color.id) stopEditing();
    setPendingDelete(null);
    toast.success("رنگ حذف شد");
  }

  return <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
    <Card variant="secondary" className="rounded-2xl border border-slate-200 bg-white"><Card.Content className="p-5">
      <div className="mb-5 flex items-center justify-between"><strong>{editing ? "ویرایش رنگ" : "رنگ جدید"}</strong>{editing && <Button isIconOnly variant="ghost" onPress={stopEditing} aria-label="انصراف"><X size={17} /></Button>}</div>
      <form key={editing?.id ?? "new"} onSubmit={submit} className="grid gap-4">
        <label className={adminLabelClass}>نام رنگ<Input name="name" required minLength={2} defaultValue={editing?.name} fullWidth variant="secondary" className={adminFieldClass} placeholder="مثلاً رزگلد" /></label>
        <div className={adminLabelClass}>کد و طیف رنگ<ColorPicker value={draftColor} onChange={setDraftColor}>
          <ColorPicker.Trigger className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 text-sm shadow-none"><ColorSwatch color={draftColor} size="sm" /><span dir="ltr" className="font-mono">{draftColor.toString("hex").toUpperCase()}</span></ColorPicker.Trigger>
          <ColorPicker.Popover className="z-[190] w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="grid gap-4"><ColorArea colorSpace="hsb" xChannel="saturation" yChannel="brightness" className="h-44 w-full rounded-xl"><ColorArea.Thumb /></ColorArea><ColorSlider colorSpace="hsb" channel="hue"><ColorSlider.Track className="h-7 rounded-full"><ColorSlider.Thumb /></ColorSlider.Track></ColorSlider><ColorField><Label className="text-xs font-bold text-slate-600">کد رنگ</Label><ColorField.Group variant="secondary" fullWidth><ColorField.Input /></ColorField.Group></ColorField></div>
          </ColorPicker.Popover>
        </ColorPicker></div>
        <label className={adminLabelClass}>ترتیب نمایش<Input name="sortOrder" type="number" min="0" defaultValue={editing?.sortOrder ?? 0} fullWidth variant="secondary" className={adminFieldClass} /></label>
        <AdminCheckbox name="isActive" value="on" defaultSelected={editing?.isActive ?? true}>فعال</AdminCheckbox>
        <Button type="submit" isDisabled={loading} variant="primary" className="min-h-11 gap-2 bg-[#172b4d] text-white">{editing ? <Save size={16} /> : <Plus size={16} />}{editing ? "ذخیره تغییرات" : "افزودن رنگ"}</Button>
      </form>
    </Card.Content></Card>
    <div className="grid gap-3">{colors.map((color) => <Card key={color.id} variant="secondary" className="rounded-2xl border border-slate-200 bg-white"><Card.Content className="flex items-center gap-3 p-4"><ColorSwatch color={color.hex} size="md" className="shrink-0 shadow ring-1 ring-slate-200" /><div className="min-w-0 flex-1"><strong className="block text-sm text-slate-800">{color.name}</strong><span className="text-xs text-slate-400" dir="ltr">{color.hex} · {color.isActive ? "فعال" : "غیرفعال"}</span></div><Button isIconOnly variant="ghost" onPress={() => startEditing(color)} aria-label={`ویرایش ${color.name}`}><Pencil size={16} /></Button><Button isIconOnly variant="danger-soft" onPress={() => setPendingDelete(color)} aria-label={`حذف ${color.name}`}><Trash2 size={16} /></Button></Card.Content></Card>)}{!colors.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">هنوز رنگی ثبت نشده است.</div>}</div>
    <Modal.Backdrop isOpen={Boolean(pendingDelete)} onOpenChange={(open) => { if (!open) setPendingDelete(null); }} variant="blur">
      <Modal.Container placement="center"><Modal.Dialog aria-label="تأیید حذف رنگ" className="mx-4 max-w-md bg-white"><Modal.Header className="flex-row items-center justify-between border-b border-slate-100 p-5"><Modal.Heading className="text-base font-black">حذف رنگ</Modal.Heading><Modal.CloseTrigger aria-label="بستن" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={18} /></Modal.CloseTrigger></Modal.Header><Modal.Body className="p-5 text-sm leading-7 text-slate-600">رنگ «{pendingDelete?.name}» حذف شود؟</Modal.Body><Modal.Footer className="flex gap-2 border-t border-slate-100 p-4"><Button variant="danger" onPress={() => pendingDelete && void remove(pendingDelete)} className="font-bold">حذف رنگ</Button><Button variant="secondary" onPress={() => setPendingDelete(null)}>انصراف</Button></Modal.Footer></Modal.Dialog></Modal.Container>
    </Modal.Backdrop>
  </div>;
}
