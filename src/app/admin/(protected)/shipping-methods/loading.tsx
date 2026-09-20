import { BpPanelListSkeleton } from "@/components/admin/blueprint/skeleton";

export default function ShippingMethodsLoading() {
  return <BpPanelListSkeleton columns={8} rows={6} minWidth={880} notice rowHeight={57} />;
}
