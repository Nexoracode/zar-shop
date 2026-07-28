"use client";

import Link from "next/link";
import { ArrowRight, Printer } from "lucide-react";
import { Button } from "@/components/hero";

export function InvoiceActions({ backHref }: { backHref: string }) {
  return (
    <div className="invoice-no-print mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3">
      <Link href={backHref} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-[#b5904c] hover:text-[#785b27]">
        <ArrowRight size={16} /> بازگشت
      </Link>
      <Button type="button" variant="primary" onPress={() => window.print()} className="min-h-10 gap-2 rounded-xl bg-[#172b4d] px-5 text-sm font-bold text-white hover:bg-[#203b66]">
        <Printer size={17} /> چاپ فاکتور
      </Button>
    </div>
  );
}
