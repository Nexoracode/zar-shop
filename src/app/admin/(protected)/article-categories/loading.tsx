import { BpFormBesideTableSkeleton } from "@/components/admin/blueprint/skeleton";

export default function ArticleCategoriesLoading() {
  return <BpFormBesideTableSkeleton columns={7} rows={6} form={["field", "field", "switch"]} />;
}
