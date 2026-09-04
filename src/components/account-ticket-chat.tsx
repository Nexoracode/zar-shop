"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Modal, TextArea, toast } from "@heroui/react";
import { ArrowDown, ArrowRight, FileText, Headset, Lock, Paperclip, Send, Star, X } from "lucide-react";
import { formatDayLabel, formatTimeFa } from "@/lib/format";
import { ticketFieldLimits, TICKET_MAX_ATTACHMENTS } from "@/modules/tickets/limits";
import { ticketStatusLabels, ticketStatusTones } from "@/modules/admin/labels";

type Attachment = { id: string; url: string; mimeType: string; sizeBytes: number; originalName: string };
type Message = { id: string; ticketId: string; body: string; createdAt: string; isOwnerMessage: boolean; senderName: string; attachments: Attachment[] };
type TicketDetail = {
  id: string; subject: string; status: "OPEN" | "ANSWERED" | "CLOSED";
  category: { id: string; name: string } | null; product: { id: string; name: string; slug: string } | null;
  agentName: string | null; rating: number | null; messages: Message[];
};

const POLL_MS = 5_000;
const NEAR_BOTTOM_PX = 80;
const AUTO_RESIZE_MAX_PX = 128;

const dotToneClass: Record<string, string> = {
  neutral: "bg-slate-400",
  info: "bg-sky-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  gold: "bg-amber-600",
};

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, AUTO_RESIZE_MAX_PX)}px`;
}

function ImageAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <Modal>
      <Button type="button" variant="ghost" aria-label={`مشاهده تصویر ${attachment.originalName}`} className="relative mt-2 block size-40 min-h-40 min-w-40 overflow-hidden rounded-lg border border-black/10 p-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary user upload, not an optimizable local/remote asset */}
        <img src={attachment.url} alt={attachment.originalName} className="absolute inset-0 h-full w-full object-cover" />
      </Button>
      <Modal.Backdrop className="z-[130] !bg-black/90">
        <Modal.Container size="full" placement="center" className="h-dvh w-screen max-w-none p-0">
          <Modal.Dialog aria-label={attachment.originalName} className="h-dvh w-screen max-w-none overflow-hidden rounded-none bg-transparent shadow-none" dir="rtl">
            <Modal.Header className="absolute inset-x-0 top-0 z-20 flex-row items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
              <span className="truncate text-xs text-white/80">{attachment.originalName}</span>
              <Modal.CloseTrigger aria-label="بستن تصویر" className="grid size-10 place-items-center rounded-full text-white transition hover:bg-white/15"><X size={22} /></Modal.CloseTrigger>
            </Modal.Header>
            <Modal.Body className="grid h-dvh place-items-center overflow-hidden p-6">
              {/* eslint-disable-next-line @next/next/no-img-element -- full-screen preview of the same arbitrary upload */}
              <img src={attachment.url} alt={attachment.originalName} className="max-h-full max-w-full object-contain" />
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function AttachmentView({ attachment }: { attachment: Attachment }) {
  if (attachment.mimeType.startsWith("image/")) return <ImageAttachment attachment={attachment} />;
  return (
    <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-2 flex max-w-52 items-center gap-2 rounded-lg border border-black/10 bg-white/60 px-2.5 py-2 text-[11px]">
      <FileText size={16} className="shrink-0" />
      <span className="min-w-0 truncate">{attachment.originalName}</span>
    </a>
  );
}

function MessageBubble({ message }: { message: Message }) {
  return (
    <div className={`flex ${message.isOwnerMessage ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${message.isOwnerMessage ? "rounded-tl-sm bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]" : "rounded-tr-sm border border-[var(--border)] bg-[var(--surface)]"}`}>
        {!message.isOwnerMessage && <strong className="mb-1 block text-[10px] opacity-70">{message.senderName}</strong>}
        {message.body && <p className="m-0 whitespace-pre-wrap leading-6">{message.body}</p>}
        {message.attachments.map((attachment) => <AttachmentView key={attachment.id} attachment={attachment} />)}
        <span className={`mt-1.5 block text-[10px] ${message.isOwnerMessage ? "opacity-70" : "text-[var(--muted)]"}`}>{formatTimeFa(message.createdAt)}</span>
      </div>
    </div>
  );
}

function groupedMessageNodes(messages: Message[]) {
  const nodes: ReactNode[] = [];
  let lastDay: string | null = null;
  for (const message of messages) {
    const day = formatDayLabel(message.createdAt);
    if (day !== lastDay) {
      nodes.push(
        <div key={`day-${message.id}`} className="my-1 flex justify-center">
          <span className="rounded-full bg-black/5 px-3 py-1 text-[11px] font-bold text-[var(--muted)]">{day}</span>
        </div>,
      );
      lastDay = day;
    }
    nodes.push(<MessageBubble key={message.id} message={message} />);
  }
  return nodes;
}

export function AccountTicketChat({ ticket: initialTicket }: { ticket: TicketDetail }) {
  const [ticket, setTicket] = useState(initialTicket);
  const [messages, setMessages] = useState(initialTicket.messages);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingReason, setRatingReason] = useState("");
  const [ratingSaving, setRatingSaving] = useState(false);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  const poll = useCallback(async () => {
    const last = messages.at(-1);
    const url = last ? `/api/account/tickets/${ticket.id}/messages?after=${encodeURIComponent(last.createdAt)}` : `/api/account/tickets/${ticket.id}/messages`;
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { items?: Message[] };
      if (data.items?.length) {
        setMessages((current) => [...current, ...data.items!.filter((item) => !current.some((row) => row.id === item.id))]);
        const statusResponse = await fetch(`/api/account/tickets/${ticket.id}`, { cache: "no-store" });
        if (statusResponse.ok) {
          const fresh = (await statusResponse.json()) as TicketDetail;
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
      const response = await fetch(`/api/account/tickets/${ticket.id}/messages`, { method: "POST", body: form });
      const data = await response.json().catch(() => null) as (Message & { message?: string }) | null;
      if (!response.ok || !data) throw new Error(data?.message ?? "ارسال پیام انجام نشد.");
      setMessages((current) => [...current, data]);
      setBody("");
      setFiles([]);
      setTicket((current) => ({ ...current, status: "OPEN" }));
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
      await fetch(`/api/account/tickets/${ticket.id}/close`, { method: "POST" });
      setTicket((current) => ({ ...current, status: "CLOSED" }));
    } finally {
      setStatusBusy(false);
      setConfirmClose(false);
    }
  }

  async function submitRating() {
    if (rating === 0) return;
    if (rating <= 3 && !ratingReason.trim()) {
      toast.danger("لطفاً دلیل امتیاز پایین را بنویسید.");
      return;
    }
    setRatingSaving(true);
    try {
      const response = await fetch(`/api/account/tickets/${ticket.id}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, reason: ratingReason.trim() || null }),
      });
      const data = await response.json().catch(() => null) as { rating?: number; message?: string } | null;
      if (!response.ok) throw new Error(data?.message ?? "ثبت امتیاز انجام نشد.");
      setTicket((current) => ({ ...current, rating: data?.rating ?? rating }));
      toast.success("امتیاز شما ثبت شد.");
    } catch (reason) {
      toast.danger("ثبت امتیاز انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setRatingSaving(false);
    }
  }

  const closed = ticket.status === "CLOSED";

  return (
    <>
    <section className="flex h-[calc(100dvh-9rem)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm" dir="rtl">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3">
        <Link href="/account/tickets" aria-label="بازگشت به تیکت‌ها" className="grid size-9 shrink-0 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-secondary)]"><ArrowRight size={18} /></Link>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><Headset size={17} /></span>
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-sm font-bold">{ticket.subject}</strong>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
            <i aria-hidden className={`block size-1.5 rounded-full ${dotToneClass[ticketStatusTones[ticket.status]]}`} />
            {ticketStatusLabels[ticket.status]}{ticket.agentName ? ` · پشتیبان: ${ticket.agentName}` : ""}
          </span>
        </div>
        {!closed && (
          <Button type="button" variant="ghost" size="sm" onPress={() => setConfirmClose(true)} className="gap-1.5 text-xs">بستن تیکت</Button>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={listRef} className="h-full space-y-1.5 overflow-y-auto bg-[var(--surface-secondary)]/40 px-4 py-4">
          {groupedMessageNodes(messages)}
        </div>
        {showJumpButton && (
          <Button type="button" isIconOnly variant="secondary" aria-label="رفتن به آخرین پیام" onPress={scrollToBottom} className="absolute bottom-3 left-1/2 size-10 min-h-10 min-w-10 -translate-x-1/2 rounded-full shadow-lg">
            <ArrowDown size={17} />
          </Button>
        )}
      </div>

      {closed && ticket.rating === null ? (
        <div className="border-t border-[var(--border)] px-5 py-4">
          <strong className="block text-sm font-bold">به این تیکت چه امتیازی می‌دهید؟</strong>
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <Button key={value} type="button" isIconOnly variant="ghost" aria-label={`امتیاز ${value.toLocaleString("fa-IR")}`} onPress={() => setRating(value)} className="min-w-9">
                <Star size={22} className={value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
              </Button>
            ))}
          </div>
          {rating > 0 && rating <= 3 && (
            <TextArea
              aria-label="دلیل امتیاز پایین"
              value={ratingReason}
              onChange={(event) => setRatingReason(event.target.value.slice(0, ticketFieldLimits.ratingReason))}
              maxLength={ticketFieldLimits.ratingReason}
              placeholder="لطفاً دلیل امتیاز پایین را بنویسید…"
              variant="secondary"
              className="field-control mt-3 min-h-20 w-full"
            />
          )}
          <Button type="button" isPending={ratingSaving} isDisabled={rating === 0} onPress={() => void submitRating()} className="mt-3 gap-2 bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]">
            ثبت امتیاز
          </Button>
        </div>
      ) : closed ? (
        <div className="flex items-center justify-center gap-2 border-t border-[var(--border)] px-5 py-4 text-xs text-[var(--muted)]">
          <Lock size={14} />این تیکت بسته شده است.
        </div>
      ) : (
        <div className="border-t border-[var(--border)] p-3">
          {files.length > 0 && (
            <ul className="m-0 mb-2 flex flex-wrap gap-2 p-0">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-1 text-[11px]">
                  <span className="max-w-40 truncate">{file.name}</span>
                  <Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`حذف ${file.name}`} onPress={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="min-h-5 min-w-5 text-[var(--muted)] hover:text-[var(--danger)]">
                    <X size={12} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div ref={composerRef}>
            {/* HeroUI has no file-upload primitive; a hidden native input triggered by the styled button is the documented exception. */}
            <input ref={fileInputRef} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => addFiles(event.target.files)} />
            <TextArea
              aria-label="پیام خود را بنویسید"
              value={body}
              onChange={(event) => { setBody(event.target.value.slice(0, ticketFieldLimits.message)); autoResize(event.target); }}
              maxLength={ticketFieldLimits.message}
              placeholder="پیام خود را بنویسید…"
              rows={2}
              variant="secondary"
              className="field-control max-h-32 resize-none"
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }}
            />
            <div className="mt-2 flex items-center justify-start gap-2">
              <Button type="button" variant="ghost" size="sm" onPress={() => fileInputRef.current?.click()} isDisabled={files.length >= TICKET_MAX_ATTACHMENTS} className="gap-1.5 text-xs"><Paperclip size={15} />پیوست فایل</Button>
              <Button type="button" size="sm" isPending={sending} isDisabled={!body.trim() && files.length === 0} onPress={() => void send()} className="gap-1.5 bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]">{!sending && <Send size={15} />}ارسال</Button>
            </div>
          </div>
        </div>
      )}
    </section>

    <Modal.Backdrop isOpen={confirmClose} onOpenChange={(next) => { if (!statusBusy) setConfirmClose(next); }} variant="blur">
      <Modal.Container size="sm" placement="center">
        <Modal.Dialog aria-label="تأیید بستن تیکت" dir="rtl" className="mx-4 max-w-md bg-[var(--surface)] text-right">
          <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5">
            <Modal.Heading className="text-base font-bold">بستن تیکت</Modal.Heading>
            <Modal.CloseTrigger aria-label="بستن" className="grid size-9 place-items-center rounded-lg"><X size={18} /></Modal.CloseTrigger>
          </Modal.Header>
          <Modal.Body className="p-5 text-sm leading-7 text-[var(--muted)]">
            <Alert status="warning"><Alert.Description>این تیکت پس از بسته شدن دیگر قابل بازکردن نیست و گفت‌وگو در همین‌جا پایان می‌یابد. آیا مطمئن هستید؟</Alert.Description></Alert>
          </Modal.Body>
          <Modal.Footer className="gap-2 border-t border-[var(--border)] p-4">
            <Button type="button" variant="danger" isPending={statusBusy} onPress={() => void closeTicket()}>
              {({ isPending }) => <>{isPending ? "در حال بستن..." : "بله، بسته شود"}</>}
            </Button>
            <Button type="button" variant="secondary" isDisabled={statusBusy} onPress={() => setConfirmClose(false)}>انصراف</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
    </>
  );
}
