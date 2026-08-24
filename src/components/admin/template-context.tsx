"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AdminTemplate } from "@generated/prisma/enums";

/**
 * Which admin skin the surrounding tree is rendering. Shared primitives in `admin-ui.tsx`
 * read this to pick their markup, so a page does not have to branch on the template itself.
 *
 * Defaults to CLASSIC on purpose: `admin-ui` is also used outside the admin shell
 * (`src/app/account/reviews/page.tsx`), and those trees must keep the existing look.
 */
const AdminTemplateContext = createContext<AdminTemplate>("CLASSIC");

export function AdminTemplateProvider({ template, children }: { template: AdminTemplate; children: ReactNode }) {
  return <AdminTemplateContext.Provider value={template}>{children}</AdminTemplateContext.Provider>;
}

export function useAdminTemplate() {
  return useContext(AdminTemplateContext);
}
