import { BpFormWithAsideSkeleton } from "@/components/admin/blueprint/skeleton";

// Mirrors `BlueprintProductForm`: the panels of the product in a wide column beside the sticky publish card.
export default function EditProductLoading() {
  return (
    <BpFormWithAsideSkeleton
      panels={[
        { description: true, block: 132, action: true },
        { fields: 2 },
        { block: 220 },
        { description: true, fields: 6, grid: "sm:grid-cols-2 xl:grid-cols-3" },
        { description: true, fields: 4, grid: "sm:grid-cols-2 lg:grid-cols-4" },
        { fields: 4 },
        { fields: 3 },
        { description: true, block: 140 },
      ]}
    />
  );
}
