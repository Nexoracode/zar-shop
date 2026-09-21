"use client";

import { useState, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { Button, Popover } from "@heroui/react";
import { Bold, Eraser, Highlighter, Italic, Link2, Palette, Strikethrough, Underline, Unlink } from "lucide-react";
import { FormField, TextField } from "@/components/form-field";

// Colors offered for text and for highlighting: neutral content colors, not the store's brand palette.
const textColors = ["#17233B", "#DC2626", "#EA580C", "#CA8A04", "#16A34A", "#2563EB", "#7C3AED", "#64748B"];
const highlightColors = ["#FEF08A", "#FED7AA", "#FECACA", "#BBF7D0", "#BFDBFE", "#DDD6FE", "#E2E8F0"];

const toolClass = "size-8 min-h-8 min-w-8 rounded-md text-[var(--foreground)] data-[active=true]:bg-[var(--surface-tertiary)]";

function Tool({ label, active, disabled, onPress, children }: { label: string; active?: boolean; disabled?: boolean; onPress: () => void; children: ReactNode }) {
  return <Button type="button" isIconOnly variant="ghost" aria-label={label} aria-pressed={active} data-active={active ? "true" : undefined} isDisabled={disabled} onPress={onPress} className={toolClass}>{children}</Button>;
}

/** A toolbar button that opens a small popover (colors, the link form). */
function ToolMenu({ label, active, disabled, icon, children }: { label: string; active?: boolean; disabled?: boolean; icon: ReactNode; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  if (disabled) return <Tool label={label} disabled onPress={() => {}}>{icon}</Tool>;
  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger aria-label={label} data-active={active ? "true" : undefined} className={`grid cursor-pointer place-items-center outline-none hover:bg-[var(--surface-tertiary)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${toolClass}`}>{icon}</Popover.Trigger>
      <Popover.Content placement="bottom" dir="rtl" className="z-[190] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 text-right text-[var(--foreground)] shadow-xl">
        <Popover.Dialog dir="rtl" className="grid gap-2 p-3 text-right">{children(() => setOpen(false))}</Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

function Swatches({ colors, label, onPick, onClear }: { colors: string[]; label: string; onPick: (color: string) => void; onClear: () => void }) {
  return (
    <>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {colors.map((color) => <Button key={color} type="button" isIconOnly variant="ghost" aria-label={`${label} ${color}`} onPress={() => onPick(color)} className="size-7 min-h-7 min-w-7 rounded-full border border-black/15 p-0" style={{ backgroundColor: color }} />)}
      </div>
      <Button type="button" variant="ghost" onPress={onClear} className="h-8 min-h-8 justify-start rounded-md px-2 text-xs">بدون رنگ</Button>
    </>
  );
}

const safeLink = /^(https?:\/\/|mailto:|tel:)/i;

function LinkForm({ editor, close }: { editor: Editor; close: () => void }) {
  const [url, setUrl] = useState<string>(editor.getAttributes("link").href ?? "");
  const [error, setError] = useState("");
  function apply() {
    const value = url.trim();
    if (!safeLink.test(value)) return setError("نشانی باید با http://، https://، mailto: یا tel: شروع شود.");
    editor.chain().focus().extendMarkRange("link").setLink({ href: value }).run();
    close();
  }
  return (
    <div className="grid w-64 gap-1">
      <TextField id="rich-link-url" label="نشانی لینک" dir="ltr" value={url} maxLength={500} error={error} onChange={(event) => { setUrl(event.target.value); setError(""); }} />
      <div className="flex gap-2">
        <Button type="button" variant="primary" onPress={apply} className="h-9 min-h-9 flex-1 rounded-lg text-xs font-bold">اعمال لینک</Button>
        <Button type="button" variant="outline" isDisabled={!editor.isActive("link")} onPress={() => { editor.chain().focus().extendMarkRange("link").unsetLink().run(); close(); }} className="h-9 min-h-9 gap-1 rounded-lg text-xs font-bold"><Unlink size={14} />حذف</Button>
      </div>
    </div>
  );
}

/**
 * A small rich text control: bold, italic, strikethrough, underline, text and highlight colors, links and "clear
 * formatting", with the number of characters used under it. It holds HTML (empty string when there is no text);
 * `maxLength` counts the visible characters, is enforced while typing and pasting, and must also be enforced by the
 * server, which cleans the HTML (see `rich-text-sanitize.ts`). It takes its initial content once — remount it to reset.
 */
export function RichTextField({ id, label, value, maxLength, hint, error, disabled = false, onChange }: { id: string; label: ReactNode; value: string; maxLength: number; hint?: ReactNode; error?: ReactNode; disabled?: boolean; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    content: value,
    extensions: [
      StarterKit.configure({ heading: false, blockquote: false, bulletList: false, orderedList: false, listItem: false, listKeymap: false, codeBlock: false, code: false, horizontalRule: false, link: { openOnClick: false, autolink: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } } }),
      Highlight.configure({ multicolor: true }),
      TextStyleKit,
    ],
    editorProps: {
      attributes: { id, dir: "rtl", role: "textbox", "aria-multiline": "true", "aria-label": typeof label === "string" ? label : "متن", ...(error ? { "aria-invalid": "true" } : {}), "aria-describedby": `${id}-message` },
      // Refuse what would go past the limit: typed text here, pasted text trimmed to what still fits.
      handleTextInput: (view, from, to, text) => view.state.doc.textContent.length - (to - from) + text.length > maxLength,
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData("text/plain") ?? "";
        const { from, to } = view.state.selection;
        const room = maxLength - (view.state.doc.textContent.length - (to - from));
        if (text.length <= room) return false;
        view.dispatch(view.state.tr.insertText(text.slice(0, Math.max(room, 0)), from, to));
        return true;
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? "" : current.getHTML()),
  });

  // `useEditor` no longer re-renders on every transaction, so what the toolbar shows is read from the editor here.
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      strike: current?.isActive("strike") ?? false,
      underline: current?.isActive("underline") ?? false,
      link: current?.isActive("link") ?? false,
      color: Boolean(current?.getAttributes("textStyle").color),
      highlight: current?.isActive("highlight") ?? false,
      length: current?.state.doc.textContent.length ?? 0,
    }),
  });
  const off = disabled || !editor;

  return (
    <FormField
      id={id}
      label={label}
      hint={hint}
      error={error}
      counter={<span aria-live="polite" className={`field-message shrink-0 ${state && state.length >= maxLength ? "field-message-error" : "field-message-hint"}`}>{(state?.length ?? 0).toLocaleString("fa-IR")} از {maxLength.toLocaleString("fa-IR")} کاراکتر</span>}
    >
      <div className={`mt-2 overflow-hidden rounded-xl border bg-[var(--surface)] transition focus-within:border-[var(--field-border-focus)] focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--focus)_10%,transparent)] ${error ? "border-[var(--danger)]" : "border-[var(--field-border)]"} ${disabled ? "opacity-60" : ""}`}>
        <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--border)] px-1.5 py-1" role="toolbar" aria-label="قالب‌بندی متن">
          <Tool label="پررنگ" active={state?.bold} disabled={off} onPress={() => editor?.chain().focus().toggleBold().run()}><Bold size={16} /></Tool>
          <Tool label="کج" active={state?.italic} disabled={off} onPress={() => editor?.chain().focus().toggleItalic().run()}><Italic size={16} /></Tool>
          <Tool label="خط‌خورده" active={state?.strike} disabled={off} onPress={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></Tool>
          <Tool label="زیرخط" active={state?.underline} disabled={off} onPress={() => editor?.chain().focus().toggleUnderline().run()}><Underline size={16} /></Tool>
          <span className="mx-1 h-5 w-px bg-[var(--border)]" aria-hidden="true" />
          <ToolMenu label="رنگ متن" active={state?.color} disabled={off} icon={<Palette size={16} />}>
            {(close) => <Swatches colors={textColors} label="رنگ متن" onPick={(color) => { editor?.chain().focus().setColor(color).run(); close(); }} onClear={() => { editor?.chain().focus().unsetColor().run(); close(); }} />}
          </ToolMenu>
          <ToolMenu label="رنگ زمینه متن" active={state?.highlight} disabled={off} icon={<Highlighter size={16} />}>
            {(close) => <Swatches colors={highlightColors} label="رنگ زمینه" onPick={(color) => { editor?.chain().focus().setHighlight({ color }).run(); close(); }} onClear={() => { editor?.chain().focus().unsetHighlight().run(); close(); }} />}
          </ToolMenu>
          <ToolMenu label="لینک" active={state?.link} disabled={off} icon={<Link2 size={16} />}>
            {(close) => (editor ? <LinkForm editor={editor} close={close} /> : null)}
          </ToolMenu>
          <span className="mx-1 h-5 w-px bg-[var(--border)]" aria-hidden="true" />
          <Tool label="پاک‌کردن قالب‌بندی" disabled={off} onPress={() => editor?.chain().focus().unsetAllMarks().run()}><Eraser size={16} /></Tool>
        </div>
        <EditorContent editor={editor} className="px-3 py-2.5 text-sm leading-7 text-[var(--foreground)] [&_.tiptap]:min-h-[4.5rem] [&_.tiptap]:outline-none [&_.tiptap_p]:m-0 [&_.tiptap_a]:text-[var(--brand-primary)] [&_.tiptap_a]:underline [&_.tiptap_mark]:rounded-sm [&_.tiptap_mark]:px-0.5" />
      </div>
    </FormField>
  );
}
