"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Card, ColorArea, ColorField, ColorPicker, ColorSlider, ColorSwatch, Input, Label, parseColor, toast } from "@heroui/react";
import { AdminSaveButton } from "@/components/admin-save-button";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { HeroNumberInput } from "@/components/hero-number-input";
import { apiErrorMessage, validationErrorMessage } from "@/lib/form-errors";
import { colorSchema } from "@/modules/colors/schemas";
import { colorFieldLimits } from "@/modules/colors/schemas";

type EditableColor = { id: string; name: string; hex: string; isActive: boolean; sortOrder: number };

const colorFieldLabels: Record<string, string> = {
  name: "نام رنگ",
  hex: "کد رنگ",
  sortOrder: "ترتیب نمایش",
  isActive: "وضعیت رنگ",
};

export function ColorForm({ color }: { color?: EditableColor }) {
  const router = useRouter();
  const [name, setName] = useState(color?.name ?? "");
  const [draftColor, setDraftColor] = useState(() => parseColor(color?.hex ?? "#C9A56A"));
  const [sortOrder, setSortOrder] = useState(String(color?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(color?.isActive ?? true);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const body = { name, hex: draftColor.toString("hex").toUpperCase(), sortOrder: Number(sortOrder), isActive };
    const validation = colorSchema.safeParse(body);
    if (!validation.success) {
      const message = validationErrorMessage(validation.error.issues, colorFieldLabels);
      toast.danger("اطلاعات رنگ کامل نیست", { description: message, timeout: 5000 });
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(color ? `/api/colors/${color.id}` : "/api/colors", {
        method: color ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(result, "ذخیره رنگ انجام نشد.", colorFieldLabels));
      toast.success(color ? "تغییرات رنگ ذخیره شد" : "رنگ جدید ثبت شد");
      router.push("/admin/colors");
      router.refresh();
    } catch (reason) {
      toast.danger("ذخیره رنگ انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card variant="secondary" className="max-w-lg rounded-2xl border border-slate-200 bg-white">
      <Card.Content className="p-5">
        <form onSubmit={submit} className="grid gap-4">
          <label className={adminLabelClass}>نام رنگ
            <Input maxLength={colorFieldLimits.name} value={name} onChange={(event) => setName(event.target.value)} required minLength={2} fullWidth variant="secondary" className={adminFieldClass} placeholder="مثلاً رزگلد" />
          </label>
          <div className={adminLabelClass}>کد و طیف رنگ
            <ColorPicker value={draftColor} onChange={setDraftColor}>
              <ColorPicker.Trigger className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 text-sm shadow-none">
                <ColorSwatch color={draftColor} size="sm" />
                <span dir="ltr" className="font-mono">{draftColor.toString("hex").toUpperCase()}</span>
              </ColorPicker.Trigger>
              <ColorPicker.Popover className="z-[190] w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <div className="grid gap-4">
                  <ColorArea colorSpace="hsb" xChannel="saturation" yChannel="brightness" className="h-44 w-full rounded-xl"><ColorArea.Thumb /></ColorArea>
                  <ColorSlider colorSpace="hsb" channel="hue"><ColorSlider.Track className="h-7 rounded-full"><ColorSlider.Thumb /></ColorSlider.Track></ColorSlider>
                  <ColorField><Label className="text-xs font-bold text-slate-600">کد رنگ</Label><ColorField.Group variant="secondary" fullWidth><ColorField.Input /></ColorField.Group></ColorField>
                </div>
              </ColorPicker.Popover>
            </ColorPicker>
          </div>
          <label className={adminLabelClass}>ترتیب نمایش
            <HeroNumberInput value={sortOrder} onValueChange={setSortOrder} min="0" fullWidth variant="secondary" className={adminFieldClass} />
          </label>
          <AdminCheckbox isSelected={isActive} onChange={setIsActive}>فعال</AdminCheckbox>
          <AdminSaveButton isSaving={loading} label={color ? "ذخیره تغییرات" : "افزودن رنگ"} />
        </form>
      </Card.Content>
    </Card>
  );
}
