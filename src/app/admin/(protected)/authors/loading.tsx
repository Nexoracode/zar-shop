import { BpFormBesideTableSkeleton } from "@/components/admin/blueprint/skeleton";

export default function AuthorsLoading() {
  return <BpFormBesideTableSkeleton columns={4} rows={6} leading={1} filterTrailing form={["field", "textarea", "image"]} />;
}
