"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card, ColorSwatch, toast } from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import { AdminSaveButton } from "@/components/admin-save-button";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { TextField } from "@/components/form-field";
import { HeroNumberInput } from "@/components/hero-number-input";
import { HeroSelectField } from "@/components/hero-select-field";
import { adminLabelClass } from "@/components/admin-ui";
import { apiErrorMessage, validationErrorMessage } from "@/lib/form-errors";
import { optionFieldLimits, optionTypeSchema } from "@/modules/options/schemas";

export type EditableOptionType = {
  id: string;
  name: string;
  kind: "SELECT" | "COLOR";
  isActive: boolean;
  sortOrder: number;
  values: Array<{ id: string; label: string; colorId: string | null; isActive: boolean }>;
};

export type ColorChoice = { id: string; name: string; hex: string };

type ValueRow = { key: string; id?: string; label: string; colorId: string | null; isActive: boolean };

const optionTypeFieldLabels: Record<string, string> = {
  name: "نام نوع تنوع",
  kind: "نوع کنترل",
  sortOrder: "ترتیب نمایش",
  isActive: "وضعیت",
  values: "مقادیر",
  label: "عنوان مقدار",
  colorId: "رنگ مقدار",
};

let rowCounter = 0;
function newRow(): ValueRow {
  rowCounter += 1;
  return { key: `new-${rowCounter}`, label: "", colorId: null, isActive: true };
}

export function OptionTypeForm({ type, colors }: { type?: EditableOptionType; colors: ColorChoice[] }) {
  const router = useRouter();
  const [name, setName] = useState(type?.name ?? "");
  const [kind, setKind] = useState<"SELECT" | "COLOR">(type?.kind ?? "SELECT");
  const [sortOrder, setSortOrder] = useState(String(type?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(type?.isActive ?? true);
  const [rows, setRows] = useState<ValueRow[]>(() =>
    type?.values.length
      ? type.values.map((value) => ({ key: value.id, id: value.id, label: value.label, colorId: value.colorId, isActive: value.isActive }))
      : [newRow()],
  );
  const [loading, setLoading] = useState(false);

  const colorsById = new Map(colors.map((color) => [color.id, color]));
  const updateRow = (key: string, patch: Partial<ValueRow>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const body = {
      name,
      kind,
      isActive,
      sortOrder: Number(sortOrder),
      // A row the admin left blank is an unfinished thought, not an empty value.
      values: rows
        .filter((row) => row.label.trim())
        .map((row) => ({ ...(row.id ? { id: row.id } : {}), label: row.label, colorId: row.colorId, isActive: row.isActive })),
    };
    const validation = optionTypeSchema.safeParse(body);
    if (!validation.success) {
      toast.danger("اطلاعات نوع تنوع کامل نیست", { description: validationErrorMessage(validation.error.issues, optionTypeFieldLabels), timeout: 5000 });
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(type ? `/api/option-types/${type.id}` : "/api/option-types", {
        method: type ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(result, "ذخیره نوع تنوع انجام نشد.", optionTypeFieldLabels));
      toast.success(type ? "تغییرات نوع تنوع ذخیره شد" : "نوع تنوع جدید ثبت شد");
      router.push("/admin/option-types");
      router.refresh();
    } catch (reason) {
      toast.danger("ذخیره نوع تنوع انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card variant="secondary" className="max-w-3xl rounded-2xl border border-slate-200 bg-white">
      <Card.Content className="p-5">
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="نام نوع تنوع"
              required
              maxLength={optionFieldLimits.typeName}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="مثلاً رنگ یا سایز"
            />
            <HeroSelectField
              name="kind"
              label="نوع کنترل"
              includeEmptyOption={false}
              value={kind}
              onValueChange={(next) => setKind(next === "COLOR" ? "COLOR" : "SELECT")}
              options={[{ value: "SELECT", label: "انتخابی (متن)" }, { value: "COLOR", label: "رنگ" }]}
            />
          </div>

          <div className="grid gap-2">
            <span className={adminLabelClass}>مقادیر این نوع</span>
            <div className="grid gap-2">
              {rows.map((row) => (
                <div key={row.key} className="grid items-start gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <TextField
                    label="عنوان"
                    maxLength={optionFieldLimits.valueLabel}
                    value={row.label}
                    onChange={(event) => updateRow(row.key, { label: event.target.value })}
                    placeholder="مثلاً مشکی"
                  />
                  {kind === "COLOR" ? (
                    <HeroSelectField
                      name={`color-${row.key}`}
                      label="رنگ"
                      searchable
                      value={row.colorId ?? ""}
                      onValueChange={(value) => updateRow(row.key, { colorId: value || null })}
                      options={colors.map((color) => ({ value: color.id, label: color.name }))}
                    />
                  ) : <span className="hidden sm:block" />}
                  <div className="flex items-center gap-2 sm:pt-7">
                    {kind === "COLOR" && row.colorId && colorsById.has(row.colorId)
                      ? <ColorSwatch color={colorsById.get(row.colorId)!.hex} size="sm" className="shadow ring-1 ring-slate-200" />
                      : null}
                    <AdminCheckbox isSelected={row.isActive} onChange={(next) => updateRow(row.key, { isActive: next })}>فعال</AdminCheckbox>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger-soft"
                      isIconOnly
                      aria-label={`حذف مقدار ${row.label || "بدون عنوان"}`}
                      className="h-9 min-h-9 w-9 min-w-9 rounded-lg"
                      onPress={() => setRows((current) => (current.length > 1 ? current.filter((item) => item.key !== row.key) : [newRow()]))}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" size="sm" variant="secondary" className="min-h-9 w-fit gap-1 px-3 text-xs font-bold" onPress={() => setRows((current) => [...current, newRow()])}>
              <Plus size={14} />افزودن مقدار
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={adminLabelClass}>ترتیب نمایش
              <HeroNumberInput value={sortOrder} onValueChange={setSortOrder} min="0" max="9999" fullWidth variant="secondary" />
            </label>
            <div className="flex items-end pb-2">
              <AdminCheckbox isSelected={isActive} onChange={setIsActive}>فعال</AdminCheckbox>
            </div>
          </div>

          <AdminSaveButton isSaving={loading} label={type ? "ذخیره تغییرات" : "افزودن نوع تنوع"} />
        </form>
      </Card.Content>
    </Card>
  );
}
