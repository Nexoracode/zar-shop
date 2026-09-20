import { BpFormBesideTableSkeleton } from "@/components/admin/blueprint/skeleton";

export default function CategoriesLoading() {
  return <BpFormBesideTableSkeleton columns={8} rows={7} form={["field", "field", "textarea", "field", "image", "switch", "switch"]} />;
}
