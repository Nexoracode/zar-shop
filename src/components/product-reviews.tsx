"use client";

import { useState } from "react";
import { Alert, Button, Input, Label, Modal, Spinner, TextArea, toast } from "@heroui/react";
import { ListFilter, MessageCircleReply, MoreVertical, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import type { StorefrontReview, StorefrontReviewData } from "@/modules/reviews/service";

type Props = {
  productId: string;
  initialData: StorefrontReviewData;
  isAuthenticated: boolean;
};

type ReviewSort = "helpful" | "newest" | "buyers";

const reportReasons = [
  { value: "SPAM", label: "هرزنامه" },
  { value: "ABUSE", label: "توهین‌آمیز" },
  { value: "MISINFORMATION", label: "اطلاعات نادرست" },
  { value: "IRRELEVANT", label: "نامرتبط" },
  { value: "OTHER", label: "سایر موارد" },
] as const;

const reviewInputClass = "min-h-12 w-full rounded-md border border-slate-300 bg-transparent px-3 py-3 shadow-none hover:bg-transparent focus:border-[var(--brand-primary)] focus:bg-transparent data-[focused=true]:bg-transparent data-[hovered=true]:bg-transparent";
const reviewTextAreaClass = "min-h-40 w-full rounded-md border border-slate-300 bg-transparent px-3 py-3 shadow-none hover:bg-transparent focus:border-[var(--brand-primary)] focus:bg-transparent data-[focused=true]:bg-transparent data-[hovered=true]:bg-transparent";

async function responseMessage(response: Response) {
  const payload = await response.json().catch(() => null) as { message?: string } | null;
  return payload?.message ?? "انجام عملیات با خطا روبه‌رو شد.";
}

function updateReview(items: StorefrontReview[], id: string, update: (review: StorefrontReview) => StorefrontReview): StorefrontReview[] {
  return items.map((item) => item.id === id ? update(item) : { ...item, replies: updateReview(item.replies, id, update) });
}

export function ProductReviews({ productId, initialData, isAuthenticated }: Props) {
  const [data, setData] = useState(initialData);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<StorefrontReview | null>(null);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [reporting, setReporting] = useState<StorefrontReview | null>(null);
  const [reportReason, setReportReason] = useState<(typeof reportReasons)[number]["value"]>("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [sort, setSort] = useState<ReviewSort>("helpful");
  const [expandedReviewIds, setExpandedReviewIds] = useState<Set<string>>(new Set());

  async function refreshReviews() {
    const response = await fetch(`/api/products/${productId}/reviews`, { cache: "no-store" });
    if (response.ok) setData(await response.json() as StorefrontReviewData);
  }

  function openComposer(review: StorefrontReview | null = null) {
    setReplyTo(review);
    setRating(0);
    setTitle("");
    setBody("");
    setComposeOpen(true);
  }

  async function submitReview() {
    if (!isAuthenticated) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(replyTo ? { parentId: replyTo.id, body } : { rating, title, body }),
      });
      const message = await responseMessage(response);
      if (!response.ok) throw new Error(message);
      await refreshReviews();
      setComposeOpen(false);
      toast.success(message);
    } catch (error) { toast.danger(error instanceof Error ? error.message : "ثبت دیدگاه انجام نشد."); }
    finally { setSubmitting(false); }
  }

  async function vote(review: StorefrontReview, requested: -1 | 1) {
    if (!isAuthenticated) { toast.danger("برای رأی دادن وارد حساب کاربری شوید."); return; }
    const value = review.votes.current === requested ? 0 : requested;
    setBusyReviewId(review.id);
    try {
      const response = await fetch(`/api/reviews/${review.id}/vote`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value }) });
      const payload = await response.json().catch(() => null) as (StorefrontReview["votes"] & { message?: string }) | null;
      if (!response.ok) throw new Error(payload?.message ?? "ثبت رأی انجام نشد.");
      if (!payload) throw new Error("پاسخ رأی معتبر نیست.");
      const votes: StorefrontReview["votes"] = { likes: payload.likes, dislikes: payload.dislikes, current: payload.current };
      setData((current) => ({ ...current, reviews: updateReview(current.reviews, review.id, (item) => ({ ...item, votes })) }));
    } catch (error) { toast.danger(error instanceof Error ? error.message : "ثبت رأی انجام نشد."); }
    finally { setBusyReviewId(null); }
  }

  async function submitReport() {
    if (!reporting) return;
    setReportBusy(true);
    try {
      const response = await fetch(`/api/reviews/${reporting.id}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: reportReason, details: reportDetails }) });
      const message = await responseMessage(response);
      if (!response.ok) throw new Error(message);
      setData((current) => ({ ...current, reviews: updateReview(current.reviews, reporting.id, (item) => ({ ...item, reportedByCurrentUser: true })) }));
      setReporting(null);
      setReportDetails("");
      toast.success(message);
    } catch (error) { toast.danger(error instanceof Error ? error.message : "ثبت گزارش انجام نشد."); }
    finally { setReportBusy(false); }
  }

  const { summary } = data;
  const visibleReviews = [...data.reviews]
    .filter((review) => sort !== "buyers" || review.author.isVerifiedPurchase)
    .sort((left, right) => sort === "newest"
      ? right.createdAt.localeCompare(left.createdAt)
      : (right.votes.likes - right.votes.dislikes) - (left.votes.likes - left.votes.dislikes) || right.createdAt.localeCompare(left.createdAt));
  function toggleExpandedReview(id: string) {
    setExpandedReviewIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  return <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]" dir="rtl">
    <aside className="h-fit rounded-xl border border-slate-200 p-5 lg:sticky lg:top-24">
      <div className="flex items-end gap-2"><strong className="text-3xl font-black text-slate-900">{summary.average.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}</strong><span className="pb-1 text-xs text-slate-400">از ۵</span></div>
      <div className="my-3 flex gap-1 text-amber-400" aria-label={`${summary.average.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} از ۵ ستاره`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={18} fill={star <= Math.round(summary.average) ? "currentColor" : "none"} />)}</div>
      <p className="text-xs text-slate-500">از مجموع {summary.count.toLocaleString("fa-IR")} دیدگاه تأییدشده</p>
      <div className="mt-5 grid gap-2.5">{[5, 4, 3, 2, 1].map((score) => <div key={score} className="grid grid-cols-[28px_1fr] items-center gap-2 text-[10px] text-slate-500"><span>{score.toLocaleString("fa-IR")}</span><span className="h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${summary.count ? summary.distribution[score as 1 | 2 | 3 | 4 | 5] / summary.count * 100 : 0}%` }} /></span></div>)}</div>
      <Button type="button" variant="primary" onPress={() => openComposer()} className="mt-6 min-h-10 w-full rounded-lg bg-[var(--brand-primary)] text-xs text-[var(--brand-primary-foreground)]">ثبت دیدگاه</Button>
    </aside>

    <div className="min-w-0">
      {data.reviews.length > 0 && <div className="flex min-h-14 flex-wrap items-center gap-1 border-b border-slate-200 text-xs text-slate-500"><span className="ml-1 inline-flex items-center gap-1.5 font-bold text-slate-700"><ListFilter size={17} />مرتب‌سازی:</span>{([
        { id: "helpful", label: "مفیدترین" },
        { id: "newest", label: "جدیدترین" },
        { id: "buyers", label: "دیدگاه خریداران" },
      ] as const).map((option) => <Button key={option.id} type="button" size="sm" variant="ghost" onPress={() => setSort(option.id)} className={`relative min-h-9 rounded-none px-2 text-xs after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-[var(--brand-primary)] ${sort === option.id ? "font-bold text-[var(--brand-primary)] after:scale-x-100" : "text-slate-500 after:scale-x-0"}`}>{option.label}</Button>)}<span className="mr-auto text-[11px] text-slate-400">{visibleReviews.length.toLocaleString("fa-IR")} دیدگاه</span></div>}
      {!data.reviews.length ? <div className="rounded-xl border border-dashed border-slate-200 px-5 py-12 text-center text-sm text-slate-500">هنوز دیدگاهی برای این محصول ثبت نشده است.</div> : !visibleReviews.length ? <p className="py-12 text-center text-xs text-slate-400">دیدگاهی مطابق این فیلتر وجود ندارد.</p> : <div className="divide-y divide-slate-200 border-b border-slate-200">{visibleReviews.map((review) => <ReviewCard key={review.id} review={review} authenticated={isAuthenticated} busyReviewId={busyReviewId} expandedReviewIds={expandedReviewIds} onToggleExpanded={toggleExpandedReview} onReply={openComposer} onVote={vote} onReport={setReporting} />)}</div>}
    </div>

    <Modal.Backdrop isOpen={composeOpen} onOpenChange={setComposeOpen}>
      <Modal.Container size="md" placement="center" scroll="inside"><Modal.Dialog aria-label={replyTo ? "ثبت پاسخ دیدگاه" : "ثبت امتیاز و دیدگاه"} dir="rtl">
        <Modal.Header className="pl-10"><Modal.Heading>{replyTo ? `پاسخ به ${replyTo.author.name}` : "ثبت امتیاز و دیدگاه"}</Modal.Heading><Modal.CloseTrigger aria-label="بستن" className="left-4 right-auto" /></Modal.Header>
        <Modal.Body><div className="grid gap-5"><p className="text-sm text-slate-500">دیدگاه شما پیش از انتشار توسط مدیریت بررسی می‌شود.</p>{!isAuthenticated ? <Alert status="warning"><Alert.Description>برای ثبت دیدگاه باید وارد حساب کاربری شوید.</Alert.Description></Alert> : <>
          {!replyTo && <div><span className="mb-2 block text-xs font-bold text-slate-700">امتیاز شما</span><div className="flex gap-1" dir="ltr">{[1, 2, 3, 4, 5].map((star) => <Button key={star} type="button" isIconOnly variant="ghost" aria-label={`${star} ستاره`} onPress={() => setRating(star)} className="size-10 min-w-10 text-amber-400"><Star size={24} fill={star <= rating ? "currentColor" : "none"} /></Button>)}</div></div>}
          {!replyTo && <Label className="grid gap-2 text-xs font-bold text-slate-700">عنوان دیدگاه<Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="خلاصه تجربه شما" variant="primary" className={reviewInputClass} /></Label>}
          <Label className="grid gap-2 text-xs font-bold text-slate-700">متن {replyTo ? "پاسخ" : "دیدگاه"}<TextArea value={body} onChange={(event) => setBody(event.target.value)} minLength={3} maxLength={3000} rows={6} placeholder="تجربه خود را با جزئیات بنویسید" variant="primary" className={reviewTextAreaClass} /></Label>
        </>}</div></Modal.Body>
        <Modal.Footer><Button type="button" variant="secondary" onPress={() => setComposeOpen(false)}>انصراف</Button>{isAuthenticated ? <Button type="button" variant="primary" isPending={submitting} isDisabled={submitting || body.trim().length < 3 || (!replyTo && (!title.trim() || rating === 0))} onPress={() => void submitReview()}>ثبت دیدگاه</Button> : <Button type="button" variant="primary" onPress={() => { window.location.href = "/login"; }}>ورود به حساب کاربری</Button>}</Modal.Footer>
      </Modal.Dialog></Modal.Container>
    </Modal.Backdrop>

    <Modal.Backdrop isOpen={Boolean(reporting)} onOpenChange={(open) => { if (!open) setReporting(null); }}>
      <Modal.Container size="sm" placement="center" scroll="inside"><Modal.Dialog aria-label="گزارش دیدگاه" dir="rtl">
        <Modal.Header className="pl-10"><Modal.Heading>گزارش دیدگاه</Modal.Heading><Modal.CloseTrigger aria-label="بستن" className="left-4 right-auto" /></Modal.Header>
        <Modal.Body><div className="grid gap-4"><div className="flex flex-wrap gap-2">{reportReasons.map((reason) => <Button key={reason.value} type="button" variant={reportReason === reason.value ? "primary" : "secondary"} onPress={() => setReportReason(reason.value)}>{reason.label}</Button>)}</div><TextArea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={500} rows={4} placeholder="توضیحات تکمیلی (اختیاری)" variant="primary" className={reviewTextAreaClass} /></div></Modal.Body>
        <Modal.Footer><Button type="button" variant="secondary" onPress={() => setReporting(null)}>انصراف</Button><Button type="button" variant="danger" isPending={reportBusy} onPress={() => void submitReport()}>ثبت گزارش</Button></Modal.Footer>
      </Modal.Dialog></Modal.Container>
    </Modal.Backdrop>
  </div>;
}

function ReviewCard({ review, authenticated, busyReviewId, expandedReviewIds, onToggleExpanded, onReply, onVote, onReport }: {
  review: StorefrontReview;
  authenticated: boolean;
  busyReviewId: string | null;
  expandedReviewIds: Set<string>;
  onToggleExpanded: (id: string) => void;
  onReply: (review: StorefrontReview) => void;
  onVote: (review: StorefrontReview, value: -1 | 1) => void;
  onReport: (review: StorefrontReview) => void;
}) {
  const pending = review.status === "PENDING";
  const busy = busyReviewId === review.id;
  const expanded = expandedReviewIds.has(review.id);
  const longBody = review.body.length > 280;
  const displayedBody = longBody && !expanded ? `${review.body.slice(0, 280).trimEnd()}…` : review.body;
  return <article className="relative py-6">
    <header className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">{review.author.name.slice(0, 1)}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm font-bold text-slate-800">{review.author.name}</strong>{review.author.isManagement ? <span className="text-[10px] font-bold text-[var(--brand-primary)]">مدیریت فروشگاه</span> : review.author.isVerifiedPurchase ? <span className="text-[10px] text-emerald-700">خریدار محصول</span> : <span className="text-[10px] text-slate-400">کاربر عادی</span>}{review.rating && <span className="inline-flex items-center gap-1 text-[10px] text-amber-500"><Star size={12} fill="currentColor" />{review.rating.toLocaleString("fa-IR")}</span>}</div></div><div className="mr-auto flex shrink-0 items-center gap-1 text-[11px] text-slate-400"><span>{new Date(review.createdAt).toLocaleDateString("fa-IR")}</span>{!pending && !review.isOwn && <Button type="button" isIconOnly size="sm" variant="ghost" isDisabled={review.reportedByCurrentUser} aria-label={review.reportedByCurrentUser ? "گزارش شده" : "گزارش دیدگاه"} onPress={() => authenticated ? onReport(review) : toast.danger("برای گزارش دیدگاه وارد حساب کاربری شوید.")} className="size-8 min-h-8 min-w-8 text-slate-400"><MoreVertical size={17} /></Button>}</div></header>
    <div className="mt-4 text-sm leading-8 text-slate-700">{review.title && <strong className="mb-1 block font-bold text-slate-800">{review.title}</strong>}<p className="mb-0 whitespace-pre-wrap break-words">{displayedBody}</p>{longBody && <Button type="button" size="sm" variant="ghost" onPress={() => onToggleExpanded(review.id)} className="mt-1 min-h-8 px-0 text-xs font-bold text-[var(--brand-primary)]">{expanded ? "بستن" : "ادامه"} ‹</Button>}</div>
    {pending ? <p className="mb-0 mt-3 text-[11px] leading-6 text-slate-400">این دیدگاه فقط برای شما قابل مشاهده است؛ در حال بررسی مدیریت است و پس از تأیید برای همه نمایش داده می‌شود.</p> : <div className="mt-5 flex flex-wrap items-center gap-2">
      {!review.parentId && <Button type="button" variant="ghost" size="sm" onPress={() => onReply(review)} className="min-h-8 gap-1 text-[11px] text-slate-500"><MessageCircleReply size={14} />پاسخ</Button>}
      <div className="mr-auto flex items-center gap-1"><Button type="button" variant="ghost" size="sm" isDisabled={busy || review.isOwn} onPress={() => onVote(review, 1)} className={`min-h-8 gap-1 text-[11px] ${review.votes.current === 1 ? "text-[var(--brand-primary)]" : "text-slate-500"}`}>{busy ? <Spinner size="sm" /> : <ThumbsUp size={16} />}{review.votes.likes.toLocaleString("fa-IR")}</Button><span className="text-slate-300">·</span><Button type="button" variant="ghost" size="sm" isDisabled={busy || review.isOwn} onPress={() => onVote(review, -1)} className={`min-h-8 gap-1 text-[11px] ${review.votes.current === -1 ? "text-rose-600" : "text-slate-500"}`}><ThumbsDown size={16} />{review.votes.dislikes.toLocaleString("fa-IR")}</Button></div>
    </div>}
    {review.replies.length > 0 && <div className="relative mr-4 mt-4 border-r-2 border-slate-200 pr-6">{review.replies.map((reply) => <div key={reply.id} className="relative before:absolute before:-right-6 before:top-8 before:w-5 before:border-t-2 before:border-slate-200"><ReviewCard review={reply} authenticated={authenticated} busyReviewId={busyReviewId} expandedReviewIds={expandedReviewIds} onToggleExpanded={onToggleExpanded} onReply={onReply} onVote={onVote} onReport={onReport} /></div>)}</div>}
  </article>;
}
