import type { ZodIssue } from "zod";

type ApiErrorPayload = {
  message?: string;
  issues?: Record<string, string[] | undefined>;
};

function issueMessage(issue: ZodIssue) {
  switch (issue.code) {
    case "too_small":
      return "مقدار واردشده کمتر از حد مجاز است.";
    case "too_big":
      return "مقدار واردشده بیشتر از حد مجاز است.";
    case "invalid_format":
      return "فرمت مقدار واردشده صحیح نیست.";
    case "invalid_type":
      return "مقدار این فیلد وارد نشده یا نوع آن صحیح نیست.";
    case "invalid_value":
      return "یکی از گزینه‌های معتبر را انتخاب کنید.";
    default:
      return issue.message && !issue.message.startsWith("Invalid") ? issue.message : "مقدار واردشده معتبر نیست.";
  }
}

export function validationErrorMessage(issues: ZodIssue[], labels: Record<string, string>) {
  const messages = issues.slice(0, 3).map((issue) => {
    const field = String(issue.path[0] ?? "");
    return `${labels[field] ?? "اطلاعات فرم"}: ${issueMessage(issue)}`;
  });
  return messages.join(" ");
}

export function apiErrorMessage(payload: unknown, fallback: string, labels: Record<string, string>) {
  if (!payload || typeof payload !== "object") return fallback;
  const result = payload as ApiErrorPayload;
  if (result.issues) {
    const messages = Object.entries(result.issues)
      .filter(([, errors]) => errors?.length)
      .slice(0, 3)
      .map(([field]) => `${labels[field] ?? field}: مقدار واردشده معتبر نیست.`);
    if (messages.length) return messages.join(" ");
  }
  return result.message || fallback;
}
