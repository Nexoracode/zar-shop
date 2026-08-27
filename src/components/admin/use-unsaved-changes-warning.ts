"use client";

import { useEffect, useRef } from "react";

/**
 * Warns through the browser's own "leave site?" prompt if the tab is closed, reloaded, or
 * navigated to a new address while `isDirty` is true — editing a product that changed something,
 * or creating one that has anything filled in.
 *
 * Only reaches real navigation away from the page. Next.js's own client-side routing (a `Link`,
 * `router.push`) never fires `beforeunload`, so leaving through the form's own "انصراف"/save
 * actions is untouched by design — this exists for the ways out the app has no say over.
 *
 * The prompt's wording is the browser's own; no site can supply custom text here since browsers
 * stopped honoring `returnValue` strings years ago, precisely so a page cannot phrase its own exit
 * dialog persuasively.
 */
export function useUnsavedChangesWarning(isDirty: boolean) {
  const isDirtyRef = useRef(isDirty);
  useEffect(() => { isDirtyRef.current = isDirty; });

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
}
