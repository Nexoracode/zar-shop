"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@heroui/react";
import { ArrowDown, ArrowRight, Calendar, FileText, Headset, Info, Lock, Package, Paperclip, Phone, RotateCcw, Send, Star, Tag, User, X } from "lucide-react";
import { AdminStatusBadge } from "@/components/admin-ui";
import { ticketStatusLabels, ticketStatusTones } from "@/modules/admin/labels";
import { ticketFieldLimits, TICKET_MAX_ATTACHMENTS } from "@/modules/tickets/limits";
import { formatDate, formatDayLabel, formatTimeFa } from "@/lib/format";
import { BpButton, BpTag, BpTextarea } from "./ui";

type Attachment = { id: string; url: string; mimeType: string; sizeBytes: number; originalName: string };
type Message = { id: string; ticketId: string; body: string; createdAt: string; isOwnerMessage: boolean; senderName: string; attachments: Attachment[] };
type TicketDetail = {
  id: string; subject: string; status: "OPEN" | "ANSWERED" | "CLOSED";
  category: { id: string; name: string } | null; product: { id: string; name: string; slug: string } | null;
  customerName: string; customerPhone: string | null; agentName: string | null; rating: number | null;
  createdAt: string; messages: Message[];
};

const POLL_MS = 5_000;
const NEAR_BOTTOM_PX = 80;
const AUTO_RESIZE_MAX_PX = 128;

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, AUTO_RESIZE_MAX_PX)}px`;
}

function AttachmentView({ attachment, onOpen }: { attachment: Attachment; onOpen: (attachment: Attachment) => void }) {
  if (attachment.mimeType.startsWith("image/")) {
    return (
      <button type="button" onClick={() => onOpen(attachment)} aria-label={`مشاهده تصویر ${attachment.originalName}`} className="mt-2 block w-52 max-w-full overflow-hidden border border-[var(--bp-divider)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary user upload, not an optimizable local/remote asset */}
        <img src={attachment.url} alt={attachment.originalName} className="block max-h-52 w-full object-cover" />
      </button>
    );
  }
  return (
    <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-2 flex max-w-52 items-center gap-2 border border-[var(--bp-divider)] bg-[var(--bp-bg)]/60 px-2.5 py-2 text-[11px]">
      <FileText size={16} className="shrink-0" />
      <span className="min-w-0 truncate">{attachment.originalName}</span>
    </a>
  );
}

function MessageBubble({ message, onOpenImage }: { message: Message; onOpenImage: (attachment: Attachment) => void }) {
  return (
    <div className={`flex ${message.isOwnerMessage ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[70%] px-3.5 py-2.5 text-[13px] ${message.isOwnerMessage ? "border border-[var(--bp-divider)] bg-[var(--bp-card)]" : "bg-[var(--bp-accent)] text-[var(--bp-bg)]"}`}>
        {message.isOwnerMessage && <strong className="mb-1 block text-[10px] opacity-70">{message.senderName}</strong>}
        {message.body && <p className="m-0 whitespace-pre-wrap leading-6">{message.body}</p>}
        {message.attachments.map((attachment) => <AttachmentView key={attachment.id} attachment={attachment} onOpen={onOpenImage} />)}
        <span className={`mt-1.5 block text-[10px] ${message.isOwnerMessage ? "bp-muted" : "opacity-70"}`}>{formatTimeFa(message.createdAt)}</span>
      </div>
    </div>
  );
}

function groupedMessageNodes(messages: Message[], onOpenImage: (attachment: Attachment) => void) {
  const nodes: ReactNode[] = [];
  let lastDay: string | null = null;
  for (const message of messages) {
    const day = formatDayLabel(message.createdAt);
    if (day !== lastDay) {
      nodes.push(
        <div key={`day-${message.id}`} className="my-1 flex justify-center">
          <span className="bp-muted border border-[var(--bp-divider)] bg-[var(--bp-card)] px-3 py-1 text-[11px] font-bold">{day}</span>
        </div>,
      );
      lastDay = day;
    }
    nodes.push(<MessageBubble key={message.id} message={message} onOpenImage={onOpenImage} />);
  }
  return nodes;
}

function InfoRow({ icon, label, value, dir }: { icon: ReactNode; label: string; value: ReactNode; dir?: "ltr" | "rtl" }) {
  return (
    <div className="flex items-start gap-2.5 border-b border-[var(--bp-divider)] py-3 last:border-b-0">
      <span className="mt-0.5 shrink-0 text-[var(--bp-muted)]">{icon}</span>
      <div className="min-w-0 flex-1">
        <span className="bp-muted block text-[10px]">{label}</span>
        <span dir={dir} className="mt-0.5 block truncate text-[12px] font-bold">{value}</span>
      </div>
    </div>
  );
}

export function BlueprintTicketChat({ ticket: initialTicket }: { ticket: TicketDetail; viewerId: string }) {
  const [ticket, setTicket] = useState(initialTicket);
  const [messages, setMessages] = useState(initialTicket.messages);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [lightbox, setLightbox] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  const poll = useCallback(async () => {
    const last = messages.at(-1);
    const url = last ? `/api/admin/tickets/${ticket.id}/messages?after=${encodeURIComponent(last.createdAt)}` : `/api/admin/tickets/${ticket.id}/messages`;
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { items?: Message[] };
      if (data.items?.length) {
        setMessages((current) => [...current, ...data.items!.filter((item) => !current.some((row) => row.id === item.id))]);
        const detailResponse = await fetch(`/api/admin/tickets/${ticket.id}`, { cache: "no-store" });
        if (detailResponse.ok) {
          const fresh = (await detailResponse.json()) as TicketDetail;
          setTicket((current) => ({ ...current, status: fresh.status, agentName: fresh.agentName }));
        }
      }
    } catch {
      /* offline — try again next tick */
    }
  }, [messages, ticket.id]);

  useEffect(() => {
    const timer = window.setInterval(() => void poll(), POLL_MS);
    const onFocus = () => void poll();
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [poll]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
      atBottomRef.current = atBottom;
      setShowJumpButton(!atBottom);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (atBottomRef.current) listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!lightbox) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightbox]);

  function scrollToBottom() {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    setShowJumpButton(false);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((current) => [...current, ...Array.from(list)].slice(0, TICKET_MAX_ATTACHMENTS));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function send() {
    if (!body.trim() && files.length === 0) return;
    setSending(true);
    try {
      const form = new FormData();
      form.set("body", body.trim());
      for (const file of files) form.append("file", file);
      const response = await fetch(`/api/admin/tickets/${ticket.id}/messages`, { method: "POST", body: form });
      const data = await response.json().catch(() => null) as (Message & { message?: string }) | null;
      if (!response.ok || !data) throw new Error(data?.message ?? "ارسال پیام انجام نشد.");
      setMessages((current) => [...current, data]);
      setBody("");
      setFiles([]);
      setTicket((current) => ({ ...current, status: "ANSWERED" }));
      const textarea = composerRef.current?.querySelector<HTMLTextAreaElement>("textarea");
      if (textarea) textarea.style.height = "auto";
    } catch (reason) {
      toast.danger("ارسال پیام انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSending(false);
    }
  }

  async function closeTicket() {
    setStatusBusy(true);
    try {
      await fetch(`/api/admin/tickets/${ticket.id}/close`, { method: "POST" });
      setTicket((current) => ({ ...current, status: "CLOSED" }));
      toast.success("تیکت بسته شد.");
    } finally {
      setStatusBusy(false);
    }
  }

  async function reopenTicket() {
    setStatusBusy(true);
    try {
      await fetch(`/api/admin/tickets/${ticket.id}/reopen`, { method: "POST" });
      setTicket((current) => ({ ...current, status: "OPEN" }));
    } finally {
      setStatusBusy(false);
    }
  }

  const closed = ticket.status === "CLOSED";

  return (
    <div className="-mx-4 -my-6 sm:-mx-7">
      <section
        className="bp-frame sticky flex overflow-hidden"
        style={{ top: "var(--admin-sticky-top, 0px)", height: "calc(100dvh - var(--admin-sticky-top, 0px))" }}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-[var(--bp-divider)] px-4 py-3">
            <Link href="/admin/tickets" aria-label="بازگشت به تیکت‌ها" className="grid size-9 shrink-0 place-items-center text-[var(--bp-muted)] hover:bg-[var(--bp-hover)]"><ArrowRight size={17} /></Link>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--bp-accent-100)] text-[var(--bp-accent)]"><Headset size={16} /></span>
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-[13px] font-bold">{ticket.subject}</strong>
              <span className="bp-muted mt-0.5 block truncate text-[11px]">
                {ticket.customerName}
                {ticket.category ? ` · ${ticket.category.name}` : ""}
                {ticket.product ? ` · ${ticket.product.name}` : ""}
                {ticket.agentName ? ` · پشتیبان: ${ticket.agentName}` : ""}
              </span>
            </div>
            {ticket.rating !== null && (
              <span className="flex shrink-0 items-center gap-1 text-[11px]"><Star size={13} className="fill-amber-400 text-amber-400" />{ticket.rating.toLocaleString("fa-IR")}</span>
            )}
            <AdminStatusBadge tone={ticketStatusTones[ticket.status]}>{ticketStatusLabels[ticket.status]}</AdminStatusBadge>
            <BpButton isIconOnly size="sm" variant={showInfo ? "primary" : "ghost"} aria-label="اطلاعات تیکت" aria-pressed={showInfo} onClick={() => setShowInfo((current) => !current)}><Info size={15} /></BpButton>
            {closed
              ? <BpButton size="sm" variant="ghost" isPending={statusBusy} onClick={() => void reopenTicket()} className="gap-1.5"><RotateCcw size={13} />بازکردن دوباره</BpButton>
              : <BpButton size="sm" variant="ghost" isPending={statusBusy} onClick={() => void closeTicket()}>بستن تیکت</BpButton>}
          </div>

          <div className="relative min-h-0 flex-1">
            <div ref={listRef} className="h-full space-y-1.5 overflow-y-auto bg-[var(--bp-bg)] px-4 py-4">
              {groupedMessageNodes(messages, setLightbox)}
            </div>
            {showJumpButton && (
              <BpButton isIconOnly variant="secondary" aria-label="رفتن به آخرین پیام" onClick={scrollToBottom} className="absolute bottom-3 left-1/2 size-10 min-h-10 min-w-10 -translate-x-1/2 rounded-full shadow-lg">
                <ArrowDown size={17} />
              </BpButton>
            )}
          </div>

          {closed ? (
            <div className="flex items-center justify-center gap-2 border-t border-[var(--bp-divider)] px-5 py-4 text-[12px] text-[var(--bp-muted)]">
              <Lock size={14} />این تیکت بسته شده است.
            </div>
          ) : (
            <div className="border-t border-[var(--bp-divider)] p-3">
              {files.length > 0 && (
                <ul className="m-0 mb-2 flex flex-wrap gap-2 p-0">
                  {files.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="bp-tag bp-tag-neutral inline-flex items-center gap-1.5">
                      <span className="max-w-40 truncate">{file.name}</span>
                      <button type="button" aria-label={`حذف ${file.name}`} onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="grid h-3.5 w-3.5 place-items-center text-[var(--bp-muted)] hover:text-[var(--bp-danger)]">
                        <X size={11} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div ref={composerRef}>
                <input ref={fileInputRef} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => addFiles(event.target.files)} />
                <BpTextarea
                  aria-label="پاسخ خود را بنویسید"
                  value={body}
                  onChange={(event) => { setBody(event.target.value.slice(0, ticketFieldLimits.message)); autoResize(event.target); }}
                  maxLength={ticketFieldLimits.message}
                  placeholder="پاسخ خود را بنویسید…"
                  rows={2}
                  reserveMessage={false}
                  className="max-h-32 resize-none"
                  onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }}
                />
                <div className="mt-2 flex items-center justify-end gap-2">
                  <BpButton size="sm" onClick={() => fileInputRef.current?.click()} disabled={files.length >= TICKET_MAX_ATTACHMENTS} className="gap-1.5"><Paperclip size={14} />پیوست فایل</BpButton>
                  <BpButton size="sm" variant="primary" isPending={sending} disabled={!body.trim() && files.length === 0} onClick={() => void send()} className="gap-1.5">ارسال<Send size={14} /></BpButton>
                </div>
              </div>
            </div>
          )}
        </div>

        {showInfo && (
          <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-[var(--bp-divider)] bg-[var(--bp-card)] px-4 py-4 sm:block">
            <strong className="mb-1 block text-[12px] font-bold">اطلاعات تیکت</strong>
            <InfoRow icon={<User size={15} />} label="کاربر" value={ticket.customerName} />
            {ticket.customerPhone && <InfoRow icon={<Phone size={15} />} label="شماره تماس" value={ticket.customerPhone} dir="ltr" />}
            {ticket.category && <InfoRow icon={<Tag size={15} />} label="موضوع" value={ticket.category.name} />}
            {ticket.product && (
              <InfoRow
                icon={<Package size={15} />}
                label="محصول مرتبط"
                value={<Link href={`/products/${ticket.product.slug}`} target="_blank" className="text-[var(--bp-accent)] hover:underline">{ticket.product.name}</Link>}
              />
            )}
            <InfoRow icon={<Calendar size={15} />} label="تاریخ ثبت" value={formatDate(ticket.createdAt)} />
            {ticket.rating !== null && (
              <InfoRow
                icon={<Star size={15} />}
                label="امتیاز کاربر"
                value={<span className="flex items-center gap-1"><Star size={13} className="fill-amber-400 text-amber-400" />{ticket.rating.toLocaleString("fa-IR")} از ۵</span>}
              />
            )}
            <div className="mt-3"><BpTag tone={ticketStatusTones[ticket.status]}>{ticketStatusLabels[ticket.status]}</BpTag></div>
          </aside>
        )}
      </section>

      {lightbox && (
        <div role="dialog" aria-modal aria-label={lightbox.originalName} className="fixed inset-0 z-[130] grid place-items-center bg-black/90 p-6" onClick={() => setLightbox(null)}>
          <button type="button" aria-label="بستن تصویر" onClick={() => setLightbox(null)} className="absolute left-4 top-4 grid size-10 place-items-center rounded-full text-white transition hover:bg-white/15"><X size={22} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element -- full-screen preview of the same arbitrary upload */}
          <img src={lightbox.url} alt={lightbox.originalName} className="max-h-full max-w-full object-contain" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
