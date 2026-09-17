import { BpFormBesideTableSkeleton } from "@/components/admin/blueprint/skeleton";

export default function OptionTypesLoading() {
  return <BpFormBesideTableSkeleton columns={8} rows={7} formFields={4} selects={2} />;
}
