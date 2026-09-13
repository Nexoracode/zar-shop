const WORDS_PER_MINUTE = 200;

/** Rough estimate from word count; strips HTML tags first since article content is stored as rich text. */
export function estimateReadingMinutes(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ");
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

export function formatReadingTime(minutes: number): string {
  return `${minutes.toLocaleString("fa-IR")} دقیقه مطالعه`;
}
