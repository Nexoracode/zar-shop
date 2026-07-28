"use client";

import { useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TableKit } from "@tiptap/extension-table";
import { Button, ColorArea, ColorField, ColorPicker, ColorSlider, ColorSwatch, Input, Label, Modal, parseColor, toast } from "@heroui/react";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Braces, Code2, Columns3, Eraser, Heading1, Heading2, Heading3, Highlighter,
  ImagePlus, Italic, Link2, List, ListOrdered, Minus, Palette, Pilcrow, Quote, Redo2, Rows3, Strikethrough,
  SubscriptIcon, SuperscriptIcon, Table2, Trash2, Underline, Undo2, Unlink, UploadCloud, X,
} from "lucide-react";
import { HeroSelectField } from "@/components/hero-select-field";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";

type Props = { value?: string; onChange: (html: string) => void };

function initialContent(value?: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "<p></p>";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return `<p>${trimmed.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\n", "<br>")}</p>`;
}

export function RichTextEditor({ value, onChange }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [textColor, setTextColor] = useState(() => parseColor("#17233B"));
  const [highlightColor, setHighlightColor] = useState(() => parseColor("#FFF1A8"));

  const editor = useEditor({
    immediatelyRender: false,
    content: initialContent(value),
    editorProps: { attributes: { class: "rich-text-content min-h-80 px-5 py-4 outline-none" } },
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } } }),
      TextStyleKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      Image.configure({
        allowBase64: false,
        HTMLAttributes: { class: "rich-text-image" },
        resize: { enabled: true, minWidth: 80, minHeight: 50, alwaysPreserveAspectRatio: true },
      }),
      TableKit.configure({ table: { resizable: true, HTMLAttributes: { class: "rich-text-table" } } }),
    ],
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  if (!editor) return <div className="min-h-96 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />;

  function openLinkDialog() {
    setLinkUrl(editor?.getAttributes("link").href ?? "");
    setLinkOpen(true);
  }

  function applyLink() {
    const url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url) && !/^tel:/i.test(url)) return toast.warning("لینک معتبر وارد کنید", { description: "نشانی باید با http://، https://، mailto: یا tel: شروع شود." });
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run();
    setLinkOpen(false);
  }

  function insertImage(url: string, alt = "") {
    if (!/^https?:\/\//i.test(url)) return toast.warning("نشانی تصویر معتبر نیست", { description: "لینک تصویر باید با http:// یا https:// شروع شود." });
    editor?.chain().focus().setImage({ src: url, alt }).run();
    setImageOpen(false); setImageUrl(""); setImageAlt(""); setImageFile(null);
  }

  async function uploadImage() {
    if (!imageFile) return toast.warning("ابتدا یک تصویر انتخاب کنید");
    setUploading(true);
    try {
      const data = new FormData();
      data.set("file", imageFile); data.set("scope", "PRODUCT"); data.set("title", imageAlt.trim() || imageFile.name); data.set("alt", imageAlt.trim());
      const response = await fetch("/api/media", { method: "POST", body: data });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "بارگذاری تصویر انجام نشد.");
      const uploadedUrl = result?.items?.[0]?.url;
      if (typeof uploadedUrl !== "string") throw new Error("نشانی تصویر بارگذاری‌شده دریافت نشد.");
      insertImage(uploadedUrl, imageAlt.trim());
      toast.success("تصویر به توضیحات اضافه شد");
    } catch (reason) { toast.danger("افزودن تصویر انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" }); }
    finally { setUploading(false); }
  }

  const textLength = editor.getText().length;

  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="sticky top-0 z-20 grid gap-2 border-b border-slate-200 bg-slate-50/95 p-2.5 backdrop-blur">
      <div className="flex flex-wrap items-center gap-1">
        <Tool editor={editor} label="پاراگراف" icon={<Pilcrow size={15} />} active={editor.isActive("paragraph")} run={() => editor.chain().focus().setParagraph().run()} />
        <Tool editor={editor} label="عنوان ۱" icon={<Heading1 size={15} />} active={editor.isActive("heading", { level: 1 })} run={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
        <Tool editor={editor} label="عنوان ۲" icon={<Heading2 size={15} />} active={editor.isActive("heading", { level: 2 })} run={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <Tool editor={editor} label="عنوان ۳" icon={<Heading3 size={15} />} active={editor.isActive("heading", { level: 3 })} run={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
        <HeroSelectField name="rich-font-size" ariaLabel="اندازه متن" value="" placeholder="اندازه" includeEmptyOption options={[12, 14, 16, 18, 20, 24, 30, 36].map((size) => ({ value: `${size}px`, label: `${size.toLocaleString("fa-IR")} پیکسل` }))} onValueChange={(size) => { if (size) editor.chain().focus().setFontSize(size).run(); }} className="w-28" />
        <HeroSelectField name="rich-font-family" ariaLabel="قلم متن" value="" placeholder="قلم" includeEmptyOption options={[{ value: "Vazir", label: "وزیر" }, { value: "Tahoma", label: "تاهوما" }, { value: "Arial", label: "Arial" }, { value: "Georgia", label: "Georgia" }]} onValueChange={(font) => { if (font) editor.chain().focus().setFontFamily(font).run(); }} className="w-28" />
        <HeroSelectField name="rich-line-height" ariaLabel="فاصله خطوط" value="" placeholder="فاصله خط" includeEmptyOption options={["1.5", "1.8", "2", "2.3"].map((height) => ({ value: height, label: height }))} onValueChange={(height) => { if (height) editor.chain().focus().setLineHeight(height).run(); }} className="w-28" />
        <Divider />
        <Tool editor={editor} label="ضخیم" icon={<Bold size={15} />} active={editor.isActive("bold")} run={() => editor.chain().focus().toggleBold().run()} />
        <Tool editor={editor} label="کج" icon={<Italic size={15} />} active={editor.isActive("italic")} run={() => editor.chain().focus().toggleItalic().run()} />
        <Tool editor={editor} label="زیرخط" icon={<Underline size={15} />} active={editor.isActive("underline")} run={() => editor.chain().focus().toggleUnderline().run()} />
        <Tool editor={editor} label="خط‌خورده" icon={<Strikethrough size={15} />} active={editor.isActive("strike")} run={() => editor.chain().focus().toggleStrike().run()} />
        <Tool editor={editor} label="کد" icon={<Code2 size={15} />} active={editor.isActive("code")} run={() => editor.chain().focus().toggleCode().run()} />
        <Tool editor={editor} label="زیرنویس" icon={<SubscriptIcon size={15} />} active={editor.isActive("subscript")} run={() => editor.chain().focus().toggleSubscript().run()} />
        <Tool editor={editor} label="بالانویس" icon={<SuperscriptIcon size={15} />} active={editor.isActive("superscript")} run={() => editor.chain().focus().toggleSuperscript().run()} />
        <ColorTool label="رنگ متن" icon={<Palette size={15} />} color={textColor} onChange={(color) => { setTextColor(color); editor.chain().focus().setColor(color.toString("hex")).run(); }} />
        <ColorTool label="رنگ زمینه متن" icon={<Highlighter size={15} />} color={highlightColor} onChange={(color) => { setHighlightColor(color); editor.chain().focus().setHighlight({ color: color.toString("hex") }).run(); }} />
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Tool editor={editor} label="راست‌چین" icon={<AlignRight size={15} />} active={editor.isActive({ textAlign: "right" })} run={() => editor.chain().focus().setTextAlign("right").run()} />
        <Tool editor={editor} label="وسط‌چین" icon={<AlignCenter size={15} />} active={editor.isActive({ textAlign: "center" })} run={() => editor.chain().focus().setTextAlign("center").run()} />
        <Tool editor={editor} label="چپ‌چین" icon={<AlignLeft size={15} />} active={editor.isActive({ textAlign: "left" })} run={() => editor.chain().focus().setTextAlign("left").run()} />
        <Tool editor={editor} label="تراز دوطرفه" icon={<AlignJustify size={15} />} active={editor.isActive({ textAlign: "justify" })} run={() => editor.chain().focus().setTextAlign("justify").run()} />
        <Divider />
        <Tool editor={editor} label="فهرست نشانه‌دار" icon={<List size={15} />} active={editor.isActive("bulletList")} run={() => editor.chain().focus().toggleBulletList().run()} />
        <Tool editor={editor} label="فهرست شماره‌دار" icon={<ListOrdered size={15} />} active={editor.isActive("orderedList")} run={() => editor.chain().focus().toggleOrderedList().run()} />
        <Tool editor={editor} label="نقل‌قول" icon={<Quote size={15} />} active={editor.isActive("blockquote")} run={() => editor.chain().focus().toggleBlockquote().run()} />
        <Tool editor={editor} label="بلوک کد" icon={<Braces size={15} />} active={editor.isActive("codeBlock")} run={() => editor.chain().focus().toggleCodeBlock().run()} />
        <Tool editor={editor} label="خط جداکننده" icon={<Minus size={15} />} run={() => editor.chain().focus().setHorizontalRule().run()} />
        <Divider />
        <Tool editor={editor} label="افزودن لینک" icon={<Link2 size={15} />} active={editor.isActive("link")} run={openLinkDialog} />
        <Tool editor={editor} label="حذف لینک" icon={<Unlink size={15} />} disabled={!editor.isActive("link")} run={() => editor.chain().focus().unsetLink().run()} />
        <Tool editor={editor} label="افزودن تصویر" icon={<ImagePlus size={15} />} run={() => setImageOpen(true)} />
        <Tool editor={editor} label="افزودن جدول" icon={<Table2 size={15} />} run={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        {editor.isActive("table") && <><Tool editor={editor} label="افزودن ردیف" icon={<Rows3 size={15} />} run={() => editor.chain().focus().addRowAfter().run()} /><Tool editor={editor} label="افزودن ستون" icon={<Columns3 size={15} />} run={() => editor.chain().focus().addColumnAfter().run()} /><Tool editor={editor} label="حذف ردیف" icon={<Trash2 size={15} />} run={() => editor.chain().focus().deleteRow().run()} /><Tool editor={editor} label="حذف ستون" icon={<Trash2 size={15} />} run={() => editor.chain().focus().deleteColumn().run()} /><Tool editor={editor} label="حذف جدول" icon={<Trash2 size={15} />} run={() => editor.chain().focus().deleteTable().run()} /></>}
        <Divider />
        <Tool editor={editor} label="پاک‌کردن قالب‌بندی" icon={<Eraser size={15} />} run={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} />
        <Tool editor={editor} label="واگرد" icon={<Undo2 size={15} />} disabled={!editor.can().undo()} run={() => editor.chain().focus().undo().run()} />
        <Tool editor={editor} label="بازانجام" icon={<Redo2 size={15} />} disabled={!editor.can().redo()} run={() => editor.chain().focus().redo().run()} />
      </div>
    </div>
    <EditorContent editor={editor} className="rich-text-editor-content min-h-80 bg-white" />
    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-400"><span>برای تغییر اندازه تصویر، آن را انتخاب کنید و دستگیره‌ها را بکشید.</span><span>{textLength.toLocaleString("fa-IR")} نویسه</span></div>

    <Modal.Backdrop isOpen={linkOpen} onOpenChange={setLinkOpen} variant="blur"><Modal.Container placement="center"><Modal.Dialog aria-label="افزودن لینک" className="mx-4 max-w-lg bg-white"><Modal.Header className="flex-row items-center justify-between border-b border-slate-100 p-5"><Modal.Heading className="text-base font-black">افزودن لینک</Modal.Heading><Modal.CloseTrigger aria-label="بستن" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={18} /></Modal.CloseTrigger></Modal.Header><Modal.Body className="p-5"><label className={adminLabelClass}>نشانی لینک<Input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} dir="ltr" placeholder="https://example.com" fullWidth variant="secondary" className={adminFieldClass} /></label></Modal.Body><Modal.Footer className="flex gap-2 border-t border-slate-100 p-4"><Button type="button" variant="primary" onPress={applyLink}>ثبت لینک</Button><Button type="button" variant="secondary" onPress={() => setLinkOpen(false)}>انصراف</Button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop>

    <Modal.Backdrop isOpen={imageOpen} onOpenChange={setImageOpen} variant="blur"><Modal.Container placement="center"><Modal.Dialog aria-label="افزودن تصویر به توضیحات" className="mx-4 max-w-xl bg-white"><Modal.Header className="flex-row items-center justify-between border-b border-slate-100 p-5"><Modal.Heading className="text-base font-black">افزودن تصویر</Modal.Heading><Modal.CloseTrigger aria-label="بستن" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={18} /></Modal.CloseTrigger></Modal.Header><Modal.Body className="grid gap-5 p-5"><label className={adminLabelClass}>انتخاب از سیستم<Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} fullWidth variant="secondary" className={adminFieldClass} /></label><label className={adminLabelClass}>متن جایگزین تصویر<Input value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} fullWidth variant="secondary" className={adminFieldClass} placeholder="توضیح کوتاه تصویر" /></label><div className="flex items-end gap-2"><label className={`${adminLabelClass} flex-1`}>یا لینک مستقیم تصویر<Input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} dir="ltr" fullWidth variant="secondary" className={adminFieldClass} placeholder="https://example.com/image.jpg" /></label><Button type="button" variant="secondary" onPress={() => insertImage(imageUrl.trim(), imageAlt.trim())} className="min-h-11">افزودن لینک</Button></div></Modal.Body><Modal.Footer className="flex gap-2 border-t border-slate-100 p-4"><Button type="button" variant="primary" isDisabled={!imageFile || uploading} onPress={() => void uploadImage()} className="gap-2"><UploadCloud size={16} />{uploading ? "در حال بارگذاری..." : "بارگذاری و افزودن"}</Button><Button type="button" variant="secondary" onPress={() => setImageOpen(false)}>انصراف</Button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop>
  </div>;
}

function Tool({ editor: _editor, label, icon, active, disabled, run }: { editor: Editor; label: string; icon: React.ReactNode; active?: boolean; disabled?: boolean; run: () => void }) {
  void _editor;
  return <Button type="button" size="sm" isIconOnly variant={active ? "primary" : "ghost"} isDisabled={disabled} onPress={run} aria-label={label} className={`h-9 min-h-9 w-9 min-w-9 rounded-lg ${active ? "bg-[#172b4d] text-white" : "text-slate-600 hover:bg-white"}`}>{icon}</Button>;
}

function Divider() { return <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden="true" />; }

function ColorTool({ label, icon, color, onChange }: { label: string; icon: React.ReactNode; color: ReturnType<typeof parseColor>; onChange: (color: ReturnType<typeof parseColor>) => void }) {
  return <ColorPicker value={color} onChange={onChange}><ColorPicker.Trigger className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-white" aria-label={label}>{icon}<ColorSwatch color={color} size="sm" className="absolute bottom-0.5 right-1 h-2 w-5 rounded-sm" /></ColorPicker.Trigger><ColorPicker.Popover className="z-[210] w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"><div className="grid gap-4"><ColorArea colorSpace="hsb" xChannel="saturation" yChannel="brightness" className="h-44 w-full rounded-xl"><ColorArea.Thumb /></ColorArea><ColorSlider colorSpace="hsb" channel="hue"><ColorSlider.Track className="h-7 rounded-full"><ColorSlider.Thumb /></ColorSlider.Track></ColorSlider><ColorField><Label className="text-xs font-bold text-slate-600">کد رنگ</Label><ColorField.Group variant="secondary" fullWidth><ColorField.Input /></ColorField.Group></ColorField></div></ColorPicker.Popover></ColorPicker>;
}
