"use client";

import { useState } from "react";
import { PageBuilderBar } from "@/components/page-builder-bar";
import { PageBuilderOverlay } from "@/components/page-builder-overlay";

/**
 * Storefront page builder: the bottom dock plus the section-selection layer. The dock only opens a
 * menu; the page goes into edit mode (and the overlay turns on) once "edit page appearance" is pressed.
 */
export function PageBuilder() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  return (
    <>
      <PageBuilderOverlay active={editing} />
      <PageBuilderBar open={open} onOpenChange={setOpen} editing={editing} onEditingChange={setEditing} />
    </>
  );
}
