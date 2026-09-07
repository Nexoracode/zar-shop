import { BpFormBesideTableSkeleton } from "@/components/admin/blueprint/skeleton";

export default function SupportTicketCategoriesLoading() {
  return <BpFormBesideTableSkeleton columns={6} rows={6} formFields={2} selects={1} />;
}
