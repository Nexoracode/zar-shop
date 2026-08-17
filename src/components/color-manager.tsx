"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, ColorArea, ColorField, ColorPicker, ColorSlider, ColorSwatch, Input, Label, Modal, parseColor, toast } from "@heroui/react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { AdminSaveButton } from "@/components/admin-save-button";
import { AdminStatusBadge, adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { Table, TableBody, TableCell, TableColumn, TableContent, TableHeader, TableRow, TableScrollContainer, TruncatedTextTooltip } from "@/components/hero";
import { apiErrorMessage } from "@/lib/form-errors";
import { HeroNumberInput } from "@/components/hero-number-input";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";

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

  const cellClass = "border-t border-slate-100 px-3 py-2.5 text-xs";

  return <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
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
        <label className={adminLabelClass}>ترتیب نمایش<HeroNumberInput name="sortOrder" min="0" defaultValue={editing?.sortOrder ?? 0} fullWidth variant="secondary" className={adminFieldClass} /></label>
        <AdminCheckbox name="isActive" value="on" defaultSelected={editing?.isActive ?? true}>فعال</AdminCheckbox>
        <AdminSaveButton isSaving={loading} label={editing ? "ذخیره تغییرات" : "افزودن رنگ"} icon={editing ? undefined : <Plus className="!size-[15px]" />} />
      </form>
    </Card.Content></Card>
    <Card variant="secondary" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {colors.length ? <>
        <div className="divide-y divide-slate-100 md:hidden">{colors.map((color) => <article key={color.id} className="p-4"><div className="flex items-center gap-3"><ColorSwatch color={color.hex} size="md" className="shrink-0 shadow ring-1 ring-slate-200" /><div className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-700">{color.name}</strong><span dir="ltr" className="block text-right font-mono text-xs text-slate-400">{color.hex}</span></div><AdminStatusBadge tone={color.isActive ? "success" : "neutral"}>{color.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></div><div className="mt-4 flex items-center gap-2"><span className="text-xs text-slate-400">ترتیب {color.sortOrder.toLocaleString("fa-IR")}</span><div className="mr-auto flex gap-1"><Button isIconOnly size="sm" variant="ghost" onPress={() => startEditing(color)} aria-label={`ویرایش ${color.name}`}><Pencil size={14} /></Button><Button isIconOnly size="sm" variant="danger-soft" onPress={() => setPendingDelete(color)} aria-label={`حذف ${color.name}`}><Trash2 size={14} /></Button></div></div></article>)}</div>
        <AdminBulkEditor entity="colors" entityLabel="رنگ" ids={colors.map((color) => color.id)} actions={[{ value: "active:on", label: "فعال‌کردن رنگ‌ها" }, { value: "active:off", label: "غیرفعال‌کردن رنگ‌ها" }]}>
          <Table><TableScrollContainer><TableContent aria-label="فهرست رنگ‌ها" className="w-full min-w-[620px]"><TableHeader><TableColumn id="select" className="w-12 bg-slate-50 px-3 py-2.5 text-center"><span className="sr-only">انتخاب</span></TableColumn>{["رنگ", "نام", "کد", "ترتیب", "وضعیت", "عملیات"].map((head, index) => <TableColumn id={head} key={head} isRowHeader={index === 1} className="bg-slate-50 px-3 py-2.5 text-right text-[11px] font-bold text-slate-500">{head}</TableColumn>)}</TableHeader><TableBody>{colors.map((color) => <TableRow id={color.id} key={color.id} className="transition hover:bg-slate-50/70"><TableCell className={`${cellClass} w-12 text-center`}><AdminBulkCheckbox id={color.id} label={`انتخاب رنگ ${color.name}`} /></TableCell><TableCell className={`${cellClass} w-16`}><ColorSwatch color={color.hex} size="sm" className="shadow ring-1 ring-slate-200" /></TableCell><TableCell className={`${cellClass} w-44 max-w-44`}><TruncatedTextTooltip text={color.name} className="max-w-36 font-bold text-slate-700" /></TableCell><TableCell className={`${cellClass} font-mono text-slate-500`}><span dir="ltr">{color.hex}</span></TableCell><TableCell className={`${cellClass} text-slate-500`}>{color.sortOrder.toLocaleString("fa-IR")}</TableCell><TableCell className={cellClass}><AdminStatusBadge tone={color.isActive ? "success" : "neutral"}>{color.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></TableCell><TableCell className={cellClass}><div className="flex items-center gap-1"><Button isIconOnly size="sm" variant="ghost" onPress={() => startEditing(color)} aria-label={`ویرایش ${color.name}`} className="h-8 min-h-8 w-8 min-w-8"><Pencil size={14} /></Button><Button isIconOnly size="sm" variant="danger-soft" onPress={() => setPendingDelete(color)} aria-label={`حذف ${color.name}`} className="h-8 min-h-8 w-8 min-w-8"><Trash2 size={14} /></Button></div></TableCell></TableRow>)}</TableBody></TableContent></TableScrollContainer></Table>
        </AdminBulkEditor>
      </> : <div className="px-4 py-8 text-center text-xs text-slate-500">هنوز رنگی ثبت نشده است.</div>}
    </Card>
    <Modal.Backdrop isOpen={Boolean(pendingDelete)} onOpenChange={(open) => { if (!open) setPendingDelete(null); }} variant="blur">
      <Modal.Container placement="center"><Modal.Dialog aria-label="تأیید حذف رنگ" className="mx-4 max-w-md bg-white"><Modal.Header className="flex-row items-center justify-between border-b border-slate-100 p-5"><Modal.Heading className="text-base font-bold">حذف رنگ</Modal.Heading><Modal.CloseTrigger aria-label="بستن" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={18} /></Modal.CloseTrigger></Modal.Header><Modal.Body className="p-5 text-sm leading-7 text-slate-600">رنگ «{pendingDelete?.name}» حذف شود؟</Modal.Body><Modal.Footer className="flex gap-2 border-t border-slate-100 p-4"><Button variant="danger" onPress={() => pendingDelete && void remove(pendingDelete)} className="font-bold">حذف رنگ</Button><Button variant="secondary" onPress={() => setPendingDelete(null)}>انصراف</Button></Modal.Footer></Modal.Dialog></Modal.Container>
    </Modal.Backdrop>
  </div>;
}
