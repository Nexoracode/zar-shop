import { BpFormBesideTableSkeleton } from "@/components/admin/blueprint/skeleton";

export default function AuthorsLoading() {
  return <BpFormBesideTableSkeleton columns={4} rows={6} formFields={2} selects={0} />;
}
