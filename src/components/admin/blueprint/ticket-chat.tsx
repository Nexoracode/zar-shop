"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@heroui/react";
import { ArrowRight, FileText, Headset, Lock, Paperclip, RotateCcw, Send, Star, X } from "lucide-react";
import { AdminStatusBadge } from "@/components/admin-ui";
import { ticketStatusLabels, ticketStatusTones } from "@/modules/admin/labels";
import { ticketFieldLimits, TICKET_MAX_ATTACHMENTS } from "@/modules/tickets/limits";
import { BpButton, BpTextarea, formatPersianDateTime } from "./ui";

type Attachment = { id: string; url: string; mimeType: string; sizeBytes: number; originalName: string };
type Message = { id: string; ticketId: string; body: string; createdAt: string; isOwnerMessage: boolean; senderName: string; attachments: Attachment[] };
type TicketDetail = {
  id: string; subject: string; status: "OPEN" | "ANSWERED" | "CLOSED";
  category: { id: string; name: string } | null; product: { id: string; name: string; slug: string } | null;
  customerName: string; agentName: string | null; rating: number | null; messages: Message[];
};

const POLL_MS = 5_000;

function AttachmentView({ attachment }: { attachment: Attachment }) {
  if (attachment.mimeType.startsWith("image/")) {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-2 block max-w-52 overflow-hidden border border-[var(--bp-divider)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary user upload, not an optimizable local/remote asset */}
        <img src={attachment.url} alt={attachment.originalName} className="block max-h-52 w-full object-cover" />
      </a>
    );
  }
  return (
    <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-2 flex max-w-52 items-center gap-2 border border-[var(--bp-divider)] bg-[var(--bp-bg)]/60 px-2.5 py-2 text-[11px]">
      <FileText size={16} className="shrink-0" />
      <span className="min-w-0 truncate">{attachment.originalName}</span>
    </a>
  );
}

export function BlueprintTicketChat({ ticket: initialTicket }: { ticket: TicketDetail; viewerId: string }) {
  const [ticket, setTicket] = useState(initialTicket);
  const [messages, setMessages] = useState(initialTicket.messages);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

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
        className="bp-frame sticky flex flex-col overflow-hidden"
        style={{ top: "var(--admin-sticky-top, 0px)", height: "calc(100dvh - var(--admin-sticky-top, 0px))" }}
      >
        <div className="flex items-center gap-3 border-b border-[var(--bp-divider)] px-4 py-3">
          <Link href="/admin/tickets" aria-label="بازگشت به تیکت‌ها" className="grid size-9 shrink-0 place-items-center text-[var(--bp-muted)] hover:bg-[var(--bp-hover)]"><ArrowRight size={17} /></Link>
          <Headset size={17} className="shrink-0 text-[var(--bp-accent)]" />
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
          {closed
            ? <BpButton size="sm" variant="ghost" isPending={statusBusy} onClick={() => void reopenTicket()} className="gap-1.5"><RotateCcw size={13} />بازکردن دوباره</BpButton>
            : <BpButton size="sm" variant="ghost" isPending={statusBusy} onClick={() => void closeTicket()}>بستن تیکت</BpButton>}
        </div>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-[var(--bp-bg)] px-4 py-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.isOwnerMessage ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[70%] px-3.5 py-2.5 text-[13px] ${message.isOwnerMessage ? "border border-[var(--bp-divider)] bg-[var(--bp-card)]" : "bg-[var(--bp-accent)] text-[var(--bp-bg)]"}`}>
                {message.isOwnerMessage && <strong className="mb-1 block text-[10px] opacity-70">{message.senderName}</strong>}
                {message.body && <p className="m-0 whitespace-pre-wrap leading-6">{message.body}</p>}
                {message.attachments.map((attachment) => <AttachmentView key={attachment.id} attachment={attachment} />)}
                <span className={`mt-1.5 block text-[10px] ${message.isOwnerMessage ? "bp-muted" : "opacity-70"}`}>{formatPersianDateTime(message.createdAt)}</span>
              </div>
            </div>
          ))}
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
            <div className="flex items-end gap-2">
              <input ref={fileInputRef} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => addFiles(event.target.files)} />
              <BpButton isIconOnly variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={files.length >= TICKET_MAX_ATTACHMENTS} aria-label="پیوست فایل" className="shrink-0"><Paperclip size={16} /></BpButton>
              <BpTextarea
                aria-label="پاسخ خود را بنویسید"
                value={body}
                onChange={(event) => setBody(event.target.value.slice(0, ticketFieldLimits.message))}
                maxLength={ticketFieldLimits.message}
                placeholder="پاسخ خود را بنویسید…"
                rows={1}
                wrapperClassName="flex-1"
                onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }}
              />
              <BpButton isIconOnly variant="primary" isPending={sending} disabled={!body.trim() && files.length === 0} onClick={() => void send()} aria-label="ارسال پیام" className="shrink-0"><Send size={16} /></BpButton>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
