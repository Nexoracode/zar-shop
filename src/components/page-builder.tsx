"use client";

import { useState } from "react";
import { PageBuilderBar } from "@/components/page-builder-bar";
import { PageBuilderOverlay } from "@/components/page-builder-overlay";

/** Storefront page builder: the bottom dock plus, while it is open, the section-selection layer. */
export function PageBuilder() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageBuilderOverlay active={open} />
      <PageBuilderBar open={open} onOpenChange={setOpen} />
    </>
  );
}
