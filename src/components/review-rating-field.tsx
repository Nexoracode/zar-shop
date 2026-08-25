"use client";

import { useId } from "react";
import { Button } from "@heroui/react";
import { Star } from "lucide-react";

const scores = [1, 2, 3, 4, 5] as const;

/**
 * The star row, with its error message in the same reserved slot the text fields use.
 *
 * The message deliberately sits here rather than in a toast: a toast renders outside the dialog
 * and the modal treats that as an interaction outside itself.
 */
export function ReviewRatingField({ rating, onChange, error, label = "امتیاز شما", size = "md", showLabel = true, className = "" }: {
  rating: number;
  onChange: (rating: number) => void;
  error?: string;
  label?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}) {
  const messageId = `${useId()}-rating-message`;
  const starSize = size === "sm" ? 22 : 26;
  return (
    <div className={className}>
      {showLabel && <span className="field-label">{label}<span aria-hidden className="text-[var(--danger)]"> *</span></span>}
      <div
        role="radiogroup"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? messageId : undefined}
        className="flex gap-1"
        dir="ltr"
      >
        {scores.map((score) => (
          <Button
            key={score}
            type="button"
            isIconOnly
            variant="ghost"
            data-rating-star={score}
            aria-label={`${score.toLocaleString("fa-IR")} ستاره`}
            aria-pressed={rating === score}
            onPress={() => onChange(score)}
            className={`${size === "sm" ? "size-9 min-h-9 min-w-9" : "size-11 min-h-11 min-w-11"} text-amber-400`}
          >
            <Star size={starSize} fill={score <= rating ? "currentColor" : "none"} />
          </Button>
        ))}
      </div>
      <span id={messageId} className={`field-message ${error ? "field-message-error" : "field-message-hint"}`}>{error ?? ""}</span>
    </div>
  );
}
