"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { TextAreaField } from "@/components/form-field";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { ReviewRatingField } from "@/components/review-rating-field";
import type { StorefrontArticleComment } from "@/modules/article-comments/service";
import { commentFieldLimits } from "@/modules/article-comments/schemas";

type Props = { articleId: string; initialComments: StorefrontArticleComment[]; isAuthenticated: boolean };

function updateComment(items: StorefrontArticleComment[], id: string, update: (comment: StorefrontArticleComment) => StorefrontArticleComment): StorefrontArticleComment[] {
  return items.map((item) => item.id === id ? update(item) : { ...item, replies: updateComment(item.replies, id, update) });
}

export function ArticleComments({ articleId, initialComments, isAuthenticated }: Props) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyVote, setBusyVote] = useState<string | null>(null);

  async function refreshComments() {
    const response = await fetch(`/api/articles/${articleId}/comments`, { cache: "no-store" });
    if (response.ok) setComments(await response.json() as StorefrontArticleComment[]);
  }

  async function submit() {
    if (!isAuthenticated) { router.push("/login"); return; }
    const trimmedBody = body.trim();
    if (rating === 0 && trimmedBody.length < 3) {
      toast.danger("امتیاز یا متن دیدگاه را وارد کنید.");
      return;
    }
    setSubmitting(true);
    try {
      const tasks: Promise<unknown>[] = [];
      if (rating > 0) tasks.push(requestJson(`/api/articles/${articleId}/rating`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: rating }) }, { fallbackMessage: "ثبت امتیاز انجام نشد." }));
      if (trimmedBody.length >= 3) tasks.push(requestJson(`/api/articles/${articleId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: trimmedBody }) }, { fallbackMessage: "ثبت دیدگاه انجام نشد." }));
      await Promise.all(tasks);
      if (trimmedBody.length >= 3) { await refreshComments(); setBody(""); }
      setRating(0);
      router.refresh();
      toast.success("ثبت شد؛ دیدگاه شما پس از بررسی مدیریت نمایش داده می‌شود.");
    } catch (error) {
      toast.danger("ثبت انجام نشد", { description: requestErrorMessage(error, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setSubmitting(false);
    }
  }

  async function vote(comment: StorefrontArticleComment, requested: -1 | 1) {
    if (!isAuthenticated) { toast.danger("برای رأی دادن وارد حساب کاربری شوید."); return; }
    const value = comment.votes.current === requested ? 0 : requested;
    setBusyVote(`${comment.id}:${requested}`);
    try {
      const response = await fetch(`/api/article-comments/${comment.id}/vote`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value }) });
      const payload = await response.json().catch(() => null) as (StorefrontArticleComment["votes"] & { message?: string }) | null;
      if (!response.ok) throw new Error(payload?.message ?? "ثبت رأی انجام نشد.");
      if (!payload) throw new Error("پاسخ رأی معتبر نیست.");
      const votes: StorefrontArticleComment["votes"] = { likes: payload.likes, dislikes: payload.dislikes, current: payload.current };
      setComments((current) => updateComment(current, comment.id, (item) => ({ ...item, votes })));
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "ثبت رأی انجام نشد.");
    } finally {
      setBusyVote(null);
    }
  }

  return (
    <div className="grid gap-4">
      {comments.length > 0 && (
        <div className="flex flex-col">
          {comments.map((comment) => <CommentCard key={comment.id} comment={comment} busyVote={busyVote} onVote={vote} />)}
        </div>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-[18px]">
        <div className="mb-3 text-[13px] font-bold text-[var(--foreground)]">ثبت امتیاز و دیدگاه</div>
        <div className="mb-3.5 flex items-center gap-2">
          <span className="text-xs text-[var(--muted)]">امتیاز شما:</span>
          <ReviewRatingField rating={rating} onChange={setRating} showLabel={false} />
        </div>
        <TextAreaField
          name="comment-body"
          aria-label="متن دیدگاه"
          rows={4}
          maxLength={commentFieldLimits.body}
          placeholder="تجربه یا نظر خود را دربارهٔ این مقاله بنویسید…"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <Button type="button" variant="primary" isPending={submitting} onPress={() => void submit()} className="mt-2.5 min-h-10 rounded-lg bg-[var(--brand-accent)] px-5 text-xs text-white">ثبت دیدگاه</Button>
      </div>
    </div>
  );
}

function CommentCard({ comment, busyVote, onVote }: {
  comment: StorefrontArticleComment;
  busyVote: string | null;
  onVote: (comment: StorefrontArticleComment, value: -1 | 1) => void;
}) {
  const busy = busyVote?.startsWith(`${comment.id}:`) ?? false;
  return (
    <article className="border-b border-[var(--border)] py-[18px] last:border-b-0">
      <div className="flex items-start gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--surface-secondary)] text-sm font-bold text-[var(--brand-accent)]">{comment.author.name.slice(0, 1)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-[13.5px] font-bold text-[var(--foreground)]">{comment.author.name}</strong>
            {comment.author.isManagement && <span className="text-[10.5px] font-bold text-[var(--brand-accent)]">مدیریت فروشگاه</span>}
            <span className="mr-auto text-[11px] text-[var(--muted)]">{new Date(comment.createdAt).toLocaleDateString("fa-IR")}</span>
          </div>
          <p className="m-0 mt-2 whitespace-pre-wrap break-words text-[13.5px] leading-8 text-[var(--foreground)]">{comment.body}</p>
          <div className="mt-2.5 flex items-center gap-3.5 text-[11.5px] text-[var(--muted)]">
            <Button type="button" variant="ghost" size="sm" isPending={busyVote === `${comment.id}:1`} isDisabled={busy || comment.isOwn} onPress={() => onVote(comment, 1)} className={`min-h-0 gap-1 rounded-none px-0 py-0 text-[11.5px] ${comment.votes.current === 1 ? "text-[var(--brand-accent)]" : "text-[var(--muted)]"}`}><ThumbsUp size={14} />{comment.votes.likes.toLocaleString("fa-IR")}</Button>
            <Button type="button" variant="ghost" size="sm" isPending={busyVote === `${comment.id}:-1`} isDisabled={busy || comment.isOwn} onPress={() => onVote(comment, -1)} className={`min-h-0 gap-1 rounded-none px-0 py-0 text-[11.5px] ${comment.votes.current === -1 ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}><ThumbsDown size={14} />{comment.votes.dislikes.toLocaleString("fa-IR")}</Button>
            {/* Decorative only — customers can't reply; replies are admin-only, matching the source design. */}
            <span className="inline-flex items-center gap-1">پاسخ</span>
          </div>

          {comment.replies.length > 0 && (
            <div className="mr-4 mt-3.5 border-r-2 border-[var(--border)] pr-[18px]">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="mb-2.5 last:mb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-[13px] font-bold text-[var(--foreground)]">{reply.author.name}</strong>
                    <span className="text-[10.5px] font-bold text-[var(--brand-accent)]">مدیریت فروشگاه</span>
                    <span className="mr-auto text-[11px] text-[var(--muted)]">{new Date(reply.createdAt).toLocaleDateString("fa-IR")}</span>
                  </div>
                  <p className="m-0 mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-8 text-[var(--foreground)]">{reply.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
