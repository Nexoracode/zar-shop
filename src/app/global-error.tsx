"use client";

import { useEffect } from "react";

// Replaces the entire <html> document when the root layout itself throws, so it must not
// depend on globals.css, Tailwind, or the HeroUI provider tree that layout.tsx sets up —
// hence the native button and inline styles instead of the usual HeroUI/CSS-var components.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[app] Root layout failed to render.", error);
  }, [error]);

  return (
    <html lang="fa" dir="rtl">
      <body style={{ margin: 0, fontFamily: "Tahoma, Arial, sans-serif", background: "#f7f6f3", color: "#17233b" }}>
        <main style={{ display: "grid", minHeight: "100dvh", placeItems: "center", padding: "1rem" }}>
          <div style={{ maxWidth: 420, textAlign: "center", background: "#fff", border: "1px solid #e7e6e2", borderRadius: 16, padding: "2rem" }}>
            <h1 style={{ margin: 0, fontSize: "1.125rem" }}>فروشگاه در دسترس نیست</h1>
            <p style={{ marginTop: "0.75rem", marginBottom: 0, lineHeight: 1.8, color: "#747982", fontSize: "0.875rem" }}>مشکلی در بارگذاری فروشگاه پیش آمد. لطفاً کمی بعد دوباره تلاش کنید.</p>
            <button
              type="button"
              onClick={() => retry()}
              style={{ marginTop: "1.5rem", cursor: "pointer", minHeight: 44, padding: "0 1.25rem", borderRadius: 12, border: "none", background: "#1c3155", color: "#fff", fontSize: "0.875rem", fontWeight: 700 }}
            >
              تلاش دوباره
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
