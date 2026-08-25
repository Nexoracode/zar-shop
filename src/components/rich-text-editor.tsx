"use client";

import { useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TableKit } from "@tiptap/extension-table";
import { TableDeleteShortcut } from "@/components/rich-text-table-delete";
import { Button, toast } from "@heroui/react";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Braces, ChevronDown, Code2, Columns3, Eraser, Heading1, Heading2, Heading3, Highlighter,
  ImagePlus, Italic, Link2, List, ListOrdered, Minus, Palette, Pilcrow, Quote, Redo2, Rows3, Strikethrough,
  SubscriptIcon, SuperscriptIcon, Table2, Trash2, Underline, Undo2, Unlink,
} from "lucide-react";
import { HeroSelectField } from "@/components/hero-select-field";
import { useAdminTemplate } from "@/components/admin/template-context";
import { BpSelect } from "@/components/admin/blueprint/ui/select";
import { BpButton } from "@/components/admin/blueprint/ui/button";
import { BpColorPicker } from "@/components/admin/blueprint/ui/color-picker";
import { AdminDialog, AdminDialogButton } from "@/components/admin/admin-dialog";
import { AdminTextField } from "@/components/admin/admin-form-fields";
import { HeroColorField } from "@/components/hero-color-field";

type Props = { value?: string; onChange: (html: string) => void };

/** Everything the toolbar draws from, read off the editor in one pass. */
function toolbarState(editor: Editor) {
  return {
    paragraph: editor.isActive("paragraph"),
    h1: editor.isActive("heading", { level: 1 }),
    h2: editor.isActive("heading", { level: 2 }),
    h3: editor.isActive("heading", { level: 3 }),
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    underline: editor.isActive("underline"),
    strike: editor.isActive("strike"),
    code: editor.isActive("code"),
    subscript: editor.isActive("subscript"),
    superscript: editor.isActive("superscript"),
    bulletList: editor.isActive("bulletList"),
    orderedList: editor.isActive("orderedList"),
    blockquote: editor.isActive("blockquote"),
    codeBlock: editor.isActive("codeBlock"),
    link: editor.isActive("link"),
    alignRight: editor.isActive({ textAlign: "right" }),
    alignCenter: editor.isActive({ textAlign: "center" }),
    alignLeft: editor.isActive({ textAlign: "left" }),
    alignJustify: editor.isActive({ textAlign: "justify" }),
    inTable: editor.isActive("table"),
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
    textColor: (editor.getAttributes("textStyle").color as string | undefined) ?? null,
    highlightColor: (editor.getAttributes("highlight").color as string | undefined) ?? null,
    characters: editor.getText().length,
  };
}

function initialContent(value?: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "<p></p>";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return `<p>${trimmed.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\n", "<br>")}</p>`;
}

export function RichTextEditor({ value, onChange }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const [imageOpen, setImageOpen] = useState(false);
  const [showAllTools, setShowAllTools] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageError, setImageError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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
      TableDeleteShortcut,
    ],
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  /*
   * `useEditor` does not re-render on every transaction any more, so reading `editor.isActive`
   * straight from the render left every toolbar state frozen at whatever it was when React last
   * happened to re-render — which is why the table's own buttons never appeared once the caret
   * was inside one. This subscribes to exactly the slice the toolbar draws from.
   */
  const liveState = useEditorState({
    editor,
    selector: ({ editor: current }) => current && toolbarState(current),
  });

  if (!editor) return <div className="min-h-96 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />;

  /*
   * `useEditorState` caches the snapshot it was constructed with, and it is constructed on the
   * first render — when `immediatelyRender: false` means there is no editor yet. It only starts
   * reporting once a transaction fires, so until then this reads the editor directly. Gating the
   * render on it instead would deadlock: no editor rendered, no transaction, no state, forever.
   */
  const marks = liveState ?? toolbarState(editor);

  function openLinkDialog() {
    setLinkUrl(editor?.getAttributes("link").href ?? "");
    setLinkError("");
    setLinkOpen(true);
  }

  function applyLink() {
    const url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url) && !/^tel:/i.test(url)) return setLinkError("نشانی باید با http://، https://، mailto: یا tel: شروع شود.");
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run();
    setLinkOpen(false);
  }

  function insertImage(url: string, alt = "") {
    if (!/^https?:\/\//i.test(url)) return setImageError("لینک تصویر باید با http:// یا https:// شروع شود.");
    editor?.chain().focus().setImage({ src: url, alt }).run();
    setImageOpen(false); setImageUrl(""); setImageAlt(""); setImageFile(null); setImageError("");
  }

  async function uploadImage() {
    if (!imageFile) return setImageError("ابتدا یک تصویر انتخاب کنید.");
    setUploading(true);
    const file = imageFile;
    const alt = imageAlt.trim();
    const uploadPromise = (async () => {
      const data = new FormData();
      data.set("file", file); data.set("scope", "PRODUCT"); data.set("title", alt || file.name); data.set("alt", alt);
      const response = await fetch("/api/media", { method: "POST", body: data });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "بارگذاری تصویر انجام نشد.");
      const uploadedUrl = result?.items?.[0]?.url;
      if (typeof uploadedUrl !== "string") throw new Error("نشانی تصویر بارگذاری‌شده دریافت نشد.");
      insertImage(uploadedUrl, alt);
      return uploadedUrl;
    })();

    toast.promise(uploadPromise, {
      loading: "تصویر در حال بارگذاری است...",
      success: "تصویر به توضیحات محصول اضافه شد",
      error: (reason) => reason.message || "افزودن تصویر انجام نشد",
    });

    try {
      await uploadPromise;
    } catch { /* toast.promise نتیجه خطا را نمایش می‌دهد. */ }
    finally { setUploading(false); }
  }

  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="sticky top-0 z-20 grid gap-2 border-b border-slate-200 bg-slate-50/95 p-2.5 backdrop-blur">
      {/*
        The row that is always out: what writing a product description actually needs. Everything
        else — typography, colour, alignment, tables, code — sits behind the toggle so the common
        case is not buried in forty icons.
      */}
      <div className="flex flex-wrap items-center gap-1">
        <Tool editor={editor} label="پاراگراف" icon={<Pilcrow size={15} />} active={marks.paragraph} run={() => editor.chain().focus().setParagraph().run()} />
        <Tool editor={editor} label="عنوان ۲" icon={<Heading2 size={15} />} active={marks.h2} run={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <Tool editor={editor} label="عنوان ۳" icon={<Heading3 size={15} />} active={marks.h3} run={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
        <Divider />
        <Tool editor={editor} label="ضخیم" icon={<Bold size={15} />} active={marks.bold} run={() => editor.chain().focus().toggleBold().run()} />
        <Tool editor={editor} label="کج" icon={<Italic size={15} />} active={marks.italic} run={() => editor.chain().focus().toggleItalic().run()} />
        <Tool editor={editor} label="زیرخط" icon={<Underline size={15} />} active={marks.underline} run={() => editor.chain().focus().toggleUnderline().run()} />
        <Divider />
        <Tool editor={editor} label="فهرست نشانه‌دار" icon={<List size={15} />} active={marks.bulletList} run={() => editor.chain().focus().toggleBulletList().run()} />
        <Tool editor={editor} label="فهرست شماره‌دار" icon={<ListOrdered size={15} />} active={marks.orderedList} run={() => editor.chain().focus().toggleOrderedList().run()} />
        <Divider />
        <Tool editor={editor} label="افزودن لینک" icon={<Link2 size={15} />} active={marks.link} run={openLinkDialog} />
        <Tool editor={editor} label="حذف لینک" icon={<Unlink size={15} />} disabled={!marks.link} run={() => editor.chain().focus().unsetLink().run()} />
        <Tool editor={editor} label="افزودن تصویر" icon={<ImagePlus size={15} />} run={() => setImageOpen(true)} />
        <Divider />
        <Tool editor={editor} label="واگرد" icon={<Undo2 size={15} />} disabled={!marks.canUndo} run={() => editor.chain().focus().undo().run()} />
        <Tool editor={editor} label="بازانجام" icon={<Redo2 size={15} />} disabled={!marks.canRedo} run={() => editor.chain().focus().redo().run()} />
        <MoreToolsToggle expanded={showAllTools} onToggle={() => setShowAllTools((current) => !current)} />
      </div>

      {showAllTools && <>
        <div className="flex flex-wrap items-center gap-1">
          <Tool editor={editor} label="عنوان ۱" icon={<Heading1 size={15} />} active={marks.h1} run={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
          <ToolSelect name="rich-font-size" label="اندازه متن" placeholder="اندازه" options={[12, 14, 16, 18, 20, 24, 30, 36].map((size) => ({ value: `${size}px`, label: `${size.toLocaleString("fa-IR")} پیکسل` }))} onPick={(size) => editor.chain().focus().setFontSize(size).run()} />
          <ToolSelect name="rich-font-family" label="قلم متن" placeholder="قلم" options={[{ value: "Vazir", label: "وزیر" }, { value: "Tahoma", label: "تاهوما" }, { value: "Arial", label: "Arial" }, { value: "Georgia", label: "Georgia" }]} onPick={(font) => editor.chain().focus().setFontFamily(font).run()} />
          <ToolSelect name="rich-line-height" label="فاصله خطوط" placeholder="فاصله خط" options={["1.5", "1.8", "2", "2.3"].map((height) => ({ value: height, label: height }))} onPick={(height) => editor.chain().focus().setLineHeight(height).run()} />
          <Divider />
          <Tool editor={editor} label="خط‌خورده" icon={<Strikethrough size={15} />} active={marks.strike} run={() => editor.chain().focus().toggleStrike().run()} />
          <Tool editor={editor} label="کد" icon={<Code2 size={15} />} active={marks.code} run={() => editor.chain().focus().toggleCode().run()} />
          <Tool editor={editor} label="زیرنویس" icon={<SubscriptIcon size={15} />} active={marks.subscript} run={() => editor.chain().focus().toggleSubscript().run()} />
          <Tool editor={editor} label="بالانویس" icon={<SuperscriptIcon size={15} />} active={marks.superscript} run={() => editor.chain().focus().toggleSuperscript().run()} />
          <ColorTool label="رنگ متن" clearLabel="حذف رنگ متن" icon={<Palette size={15} />} value={marks.textColor} fallback="#17233B" onChange={(hex) => editor.chain().focus().setColor(hex).run()} onClear={() => editor.chain().focus().unsetColor().run()} />
          <ColorTool label="رنگ زمینه متن" clearLabel="حذف رنگ زمینه" icon={<Highlighter size={15} />} value={marks.highlightColor} fallback="#FFF1A8" onChange={(hex) => editor.chain().focus().setHighlight({ color: hex }).run()} onClear={() => editor.chain().focus().unsetHighlight().run()} />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Tool editor={editor} label="راست‌چین" icon={<AlignRight size={15} />} active={marks.alignRight} run={() => editor.chain().focus().setTextAlign("right").run()} />
          <Tool editor={editor} label="وسط‌چین" icon={<AlignCenter size={15} />} active={marks.alignCenter} run={() => editor.chain().focus().setTextAlign("center").run()} />
          <Tool editor={editor} label="چپ‌چین" icon={<AlignLeft size={15} />} active={marks.alignLeft} run={() => editor.chain().focus().setTextAlign("left").run()} />
          <Tool editor={editor} label="تراز دوطرفه" icon={<AlignJustify size={15} />} active={marks.alignJustify} run={() => editor.chain().focus().setTextAlign("justify").run()} />
          <Divider />
          <Tool editor={editor} label="نقل‌قول" icon={<Quote size={15} />} active={marks.blockquote} run={() => editor.chain().focus().toggleBlockquote().run()} />
          <Tool editor={editor} label="بلوک کد" icon={<Braces size={15} />} active={marks.codeBlock} run={() => editor.chain().focus().toggleCodeBlock().run()} />
          <Tool editor={editor} label="خط جداکننده" icon={<Minus size={15} />} run={() => editor.chain().focus().setHorizontalRule().run()} />
          <Divider />
          <Tool editor={editor} label="افزودن جدول" icon={<Table2 size={15} />} run={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
          {marks.inTable && <><Tool editor={editor} label="افزودن ردیف" icon={<Rows3 size={15} />} run={() => editor.chain().focus().addRowAfter().run()} /><Tool editor={editor} label="افزودن ستون" icon={<Columns3 size={15} />} run={() => editor.chain().focus().addColumnAfter().run()} /><Tool editor={editor} label="حذف ردیف" icon={<Trash2 size={15} />} run={() => editor.chain().focus().deleteRow().run()} /><Tool editor={editor} label="حذف ستون" icon={<Trash2 size={15} />} run={() => editor.chain().focus().deleteColumn().run()} /><Tool editor={editor} label="حذف جدول" icon={<Trash2 size={15} />} run={() => editor.chain().focus().deleteTable().run()} /></>}
          <Divider />
          <Tool editor={editor} label="پاک‌کردن قالب‌بندی" icon={<Eraser size={15} />} run={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} />
        </div>
      </>}
    </div>
    <EditorContent editor={editor} className="rich-text-editor-content min-h-80 bg-white" />
    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-400"><span>برای تغییر اندازه تصویر، آن را انتخاب کنید و دستگیره‌ها را بکشید.</span><span>{marks.characters.toLocaleString("fa-IR")} نویسه</span></div>

    <LinkDialog
      open={linkOpen}
      url={linkUrl}
      error={linkError}
      onUrlChange={(next) => { setLinkUrl(next); setLinkError(""); }}
      onClose={() => setLinkOpen(false)}
      onApply={applyLink}
    />

    <ImageDialog
      open={imageOpen}
      alt={imageAlt}
      url={imageUrl}
      error={imageError}
      uploading={uploading}
      hasFile={Boolean(imageFile)}
      onFileChange={(file) => { setImageFile(file); setImageError(""); }}
      onAltChange={setImageAlt}
      onUrlChange={(next) => { setImageUrl(next); setImageError(""); }}
      onInsertUrl={() => insertImage(imageUrl.trim(), imageAlt.trim())}
      onUpload={() => void uploadImage()}
      onClose={() => setImageOpen(false)}
    />

  </div>;
}

function Tool({ editor: _editor, label, icon, active, disabled, run }: { editor: Editor; label: string; icon: React.ReactNode; active?: boolean; disabled?: boolean; run: () => void }) {
  void _editor;
  return <Button type="button" size="sm" isIconOnly variant={active ? "primary" : "ghost"} isDisabled={disabled} onPress={run} aria-label={label} className={`h-9 min-h-9 w-9 min-w-9 rounded-lg ${active ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-slate-600 hover:bg-white"}`}>{icon}</Button>;
}

/**
 * A toolbar dropdown. It holds no value of its own — picking an option applies it to the
 * selection and the control returns to its placeholder — and it renders with whichever design
 * system the surrounding admin template uses.
 */
function ToolSelect({ name, label, placeholder, options, onPick }: { name: string; label: string; placeholder: string; options: Array<{ value: string; label: string }>; onPick: (value: string) => void }) {
  const template = useAdminTemplate();
  if (template === "BLUEPRINT") {
    return (
      <BpSelect
        name={name}
        aria-label={label}
        value=""
        placeholder={placeholder}
        reserveMessage={false}
        options={options}
        onChange={(event) => { if (event.target.value) onPick(event.target.value); }}
        className="w-28"
      />
    );
  }
  return <HeroSelectField name={name} ariaLabel={label} value="" placeholder={placeholder} includeEmptyOption options={options} onValueChange={(value) => { if (value) onPick(value); }} className="w-28" />;
}

/** Reveals the rest of the toolbar. Labelled rather than icon-only: it is not a formatting mark. */
function MoreToolsToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const template = useAdminTemplate();
  const label = expanded ? "ابزارهای کمتر" : "ابزارهای بیشتر";
  if (template === "BLUEPRINT") {
    return <BpButton size="sm" variant="ghost" aria-expanded={expanded} onClick={onToggle} className="ms-auto gap-1.5">{label}<ChevronDown size={14} className={expanded ? "rotate-180 transition-transform" : "transition-transform"} /></BpButton>;
  }
  return <Button type="button" size="sm" variant="ghost" aria-expanded={expanded} onPress={onToggle} className="ms-auto h-9 min-h-9 gap-1.5 rounded-lg px-3 text-xs text-slate-600 hover:bg-white">{label}<ChevronDown size={14} className={expanded ? "rotate-180 transition-transform" : "transition-transform"} /></Button>;
}

function Divider() { return <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden="true" />; }

/**
 * A toolbar colour control. It reads the colour off the selection rather than holding one of
 * its own, so the swatch always tells the truth and "no colour" stays distinguishable from
 * "black" — which is what makes removing a colour possible. Renders with whichever design
 * system the surrounding admin template uses.
 */
function ColorTool(props: { label: string; clearLabel: string; icon: React.ReactNode; value: string | null; fallback: string; onChange: (hex: string) => void; onClear: () => void }) {
  const template = useAdminTemplate();
  if (template === "BLUEPRINT") return <BpColorPicker {...props} />;
  return <HeroColorField {...props} />;
}

/*
 * The editor's two dialogs. Both go through the shared admin dialog, so they follow whichever
 * design system the surrounding template uses, and both keep their validation message under the
 * field it belongs to rather than in a toast — a toast leaves the reader looking at an
 * unchanged form.
 */
function LinkDialog({ open, url, error, onUrlChange, onClose, onApply }: {
  open: boolean; url: string; error: string; onUrlChange: (value: string) => void; onClose: () => void; onApply: () => void;
}) {
  return (
    <AdminDialog
      open={open}
      ariaLabel="افزودن لینک"
      title="افزودن لینک"
      onClose={onClose}
      actions={<>
        <AdminDialogButton variant="primary" onPress={onApply}>ثبت لینک</AdminDialogButton>
        <AdminDialogButton variant="secondary" onPress={onClose}>انصراف</AdminDialogButton>
      </>}
    >
      <AdminTextField label="نشانی لینک" value={url} dir="ltr" placeholder="https://example.com" error={error || undefined} onChange={(event) => onUrlChange(event.target.value)} />
    </AdminDialog>
  );
}

function ImageDialog({ open, alt, url, error, uploading, hasFile, onFileChange, onAltChange, onUrlChange, onInsertUrl, onUpload, onClose }: {
  open: boolean; alt: string; url: string; error: string; uploading: boolean; hasFile: boolean;
  onFileChange: (file: File | null) => void; onAltChange: (value: string) => void; onUrlChange: (value: string) => void;
  onInsertUrl: () => void; onUpload: () => void; onClose: () => void;
}) {
  return (
    <AdminDialog
      open={open}
      ariaLabel="افزودن تصویر به توضیحات"
      title="افزودن تصویر"
      size="md"
      isBusy={uploading}
      onClose={onClose}
      actions={<>
        <AdminDialogButton variant="primary" isDisabled={!hasFile} isPending={uploading} onPress={onUpload}>{uploading ? "در حال بارگذاری..." : "بارگذاری و افزودن"}</AdminDialogButton>
        <AdminDialogButton variant="secondary" isDisabled={uploading} onPress={onClose}>انصراف</AdminDialogButton>
      </>}
    >
      <AdminTextField label="انتخاب از سیستم" type="file" accept="image/jpeg,image/png,image/webp" error={error || undefined} onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} />
      <AdminTextField label="متن جایگزین تصویر" value={alt} placeholder="توضیح کوتاه تصویر" hint="برای سئو و دسترس‌پذیری لازم است." onChange={(event) => onAltChange(event.target.value)} />
      <div className="flex items-start gap-2">
        <AdminTextField label="یا لینک مستقیم تصویر" value={url} dir="ltr" placeholder="https://example.com/image.jpg" wrapperClassName="flex-1" onChange={(event) => onUrlChange(event.target.value)} />
        <AdminDialogButton variant="secondary" className="mt-7" onPress={onInsertUrl}>افزودن لینک</AdminDialogButton>
      </div>
    </AdminDialog>
  );
}
