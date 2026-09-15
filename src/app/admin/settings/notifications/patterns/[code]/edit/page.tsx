import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintSmsPatternForm } from "@/components/admin/blueprint/sms-pattern-manager";
import { requirePermission } from "@/modules/auth/session";
import { listSmsPatterns } from "@/modules/communications/sms-patterns";

export const metadata: Metadata = { title: "ویرایش پترن پیامک" };

export default async function EditSmsPatternPage({ params }: { params: Promise<{ code: string }> }) {
  await requirePermission("settings:manage");
  const { code } = await params;
  const patterns = await listSmsPatterns();
  const pattern = patterns.find((item) => item.code === code);
  if (!pattern) notFound();

  return <>
    <AdminPageHeader eyebrow="پیامک و اعلان" title="ویرایش پترن پیامک" description={pattern.text} backHref="/admin/settings/notifications/patterns" backLabel="بازگشت به پترن‌های پیامک" />
    <BlueprintSmsPatternForm pattern={pattern} />
  </>;
}
