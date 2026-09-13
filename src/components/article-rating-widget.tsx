"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "@heroui/react";
import { Star } from "lucide-react";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { ReviewRatingField } from "@/components/review-rating-field";

export function ArticleRatingWidget({ articleId, initialAverage, initialCount, initialOwnRating, canRate }: {
  articleId: string;
  initialAverage: number;
  initialCount: number;
  initialOwnRating: number | null;
  canRate: boolean;
}) {
  const [average, setAverage] = useState(initialAverage);
  const [count, setCount] = useState(initialCount);
  const [ownRating, setOwnRating] = useState(initialOwnRating ?? 0);
  const [saving, setSaving] = useState(false);

  async function submit(value: number) {
    if (saving) return;
    setSaving(true);
    const previous = ownRating;
    setOwnRating(value);
    try {
      const result = await requestJson<{ average: number; count: number }>(`/api/articles/${articleId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      }, { fallbackMessage: "ثبت امتیاز انجام نشد." });
      setAverage(result.average);
      setCount(result.count);
      toast.success("امتیاز شما ثبت شد");
    } catch (reason) {
      setOwnRating(previous);
      toast.danger("ثبت امتیاز انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      {count > 0 && (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5 text-[var(--warning)]" dir="ltr">
            {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={16} fill={star <= Math.round(average) ? "currentColor" : "none"} />)}
          </span>
          <span className="text-xs text-[var(--muted)]">{average.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} از ۵ ({count.toLocaleString("fa-IR")} امتیاز)</span>
        </div>
      )}
      {canRate ? (
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-[var(--foreground)]">{ownRating ? "امتیاز شما" : "به این مقاله امتیاز دهید"}</span>
          <ReviewRatingField rating={ownRating} onChange={submit} showLabel={false} size="sm" />
        </div>
      ) : (
        <Link href="/login" className="text-xs font-bold text-[var(--brand-accent)]">برای ثبت امتیاز وارد حساب کاربری شوید</Link>
      )}
    </div>
  );
}
