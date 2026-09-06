import { AdminPageHeader } from "@/components/admin-ui";
import { ReportSkeleton } from "./report-skeleton";

export default function ReportsLoading() {
  return (
    <>
      <AdminPageHeader title="گزارش مالی" description="فروش، سفارش‌ها و پرفروش‌ترین محصولات و دسته‌بندی‌ها را در بازه دلخواه ببینید." />
      <div className="bp-frame mb-2 h-[76px] animate-pulse" aria-hidden />
      <ReportSkeleton />
    </>
  );
}
