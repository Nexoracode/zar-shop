import Image from "next/image";
import Link from "next/link";
import type { HomepageSettings } from "@/modules/settings/homepage-settings";

const layoutClasses = {
  TWO_COLUMNS: "sm:grid-cols-2",
  THREE_COLUMNS: "sm:grid-cols-2 lg:grid-cols-3",
  FOUR_COLUMNS: "grid-cols-2 lg:grid-cols-4",
  TWO_BY_TWO: "grid-cols-2",
} as const;

export function StorefrontImageTiles({ groups }: { groups: HomepageSettings["tileGroups"] }) {
  const visibleGroups = groups.map((group) => ({ ...group, tiles: group.tiles.filter((tile) => tile.media) })).filter((group) => group.tiles.length);
  if (!visibleGroups.length) return null;

  return <div className="grid gap-3 sm:gap-4 lg:gap-5">
    {visibleGroups.map((group) => <div key={group.id} className={`grid gap-3 sm:gap-4 ${layoutClasses[group.layout]}`}>
      {group.tiles.map((tile) => <Link key={tile.id} href={tile.href} className="group relative block aspect-[16/9] overflow-hidden rounded-xl bg-black/5 sm:rounded-2xl">
        <Image src={tile.media!.url} alt={tile.media!.alt ?? tile.media!.title ?? "تایل تصویری صفحه اصلی"} fill unoptimized={tile.media!.mimeType === "image/gif"} sizes={group.layout === "FOUR_COLUMNS" ? "(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw" : group.layout === "THREE_COLUMNS" ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" : "(max-width: 640px) 100vw, 50vw"} className="object-cover transition duration-500 group-hover:scale-[1.025]" />
      </Link>)}
    </div>)}
  </div>;
}
