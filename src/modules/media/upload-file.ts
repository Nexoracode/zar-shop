import type { MediaScope } from "@/components/media-library";

export type UploadProgress = { loaded: number; total: number; percent: number };

/**
 * Uploads one file and reports how far it has got.
 *
 * `fetch` gives no visibility into an upload's progress, so this uses `XMLHttpRequest`, which
 * still is the only way to watch bytes leave the browser. One request per file rather than one
 * request for the batch: that is what makes "which image is being uploaded" answerable, and it
 * means a single bad file fails on its own instead of taking the whole batch with it.
 */
export function uploadMediaFile(
  file: File,
  scope: MediaScope,
  meta: Record<string, unknown>,
  onProgress: (progress: UploadProgress) => void,
): Promise<{ id: string; title: string; url: string; type: "IMAGE" | "VIDEO" | "DOCUMENT" }> {
  return new Promise((resolve, reject) => {
    const data = new FormData();
    data.set("scope", scope);
    data.append("file", file);
    data.set("meta", JSON.stringify([meta]));

    const request = new XMLHttpRequest();
    request.open("POST", "/api/media");
    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      onProgress({ loaded: event.loaded, total: event.total, percent: Math.round((event.loaded / event.total) * 100) });
    });
    request.addEventListener("load", () => {
      let payload: { items?: Array<{ id: string; title: string; url: string; type: "IMAGE" | "VIDEO" | "DOCUMENT" }>; message?: string } | null = null;
      try { payload = JSON.parse(request.responseText); } catch { payload = null; }
      if (request.status >= 200 && request.status < 300 && payload?.items?.[0]) {
        onProgress({ loaded: file.size, total: file.size, percent: 100 });
        resolve(payload.items[0]);
        return;
      }
      reject(new Error(payload?.message ?? "بارگذاری فایل انجام نشد."));
    });
    request.addEventListener("error", () => reject(new Error("ارتباط با سرور برقرار نشد.")));
    request.addEventListener("abort", () => reject(new Error("بارگذاری لغو شد.")));
    request.send(data);
  });
}
