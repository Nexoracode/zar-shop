import { BlueprintAuthorsView } from "@/components/admin/blueprint/authors-view";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

export default async function AuthorsPage() {
  await requirePermission("settings:manage");
  const authors = await db.author.findMany({
    orderBy: { name: "asc" },
    include: { avatar: { select: { id: true, url: true, alt: true } }, _count: { select: { articles: true } } },
  });
  return <BlueprintAuthorsView authors={authors} />;
}
