import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import type { HomepageSettings } from "@/modules/settings/homepage-settings";

type Layout = HomepageSettings["tileGroups"][number]["layout"];

// The container of each look. The two mosaic-like looks give the group a height and place their first tile over
// several cells; the others just lay equal tiles in a row or a grid.
const layoutClasses: Record<Layout, string> = {
  SINGLE: "grid-cols-1",
  TWO_COLUMNS: "sm:grid-cols-2",
  THREE_COLUMNS: "sm:grid-cols-2 lg:grid-cols-3",
  FOUR_COLUMNS: "grid-cols-2 lg:grid-cols-4",
  TWO_BY_TWO: "grid-cols-2",
  BIG_AND_TWO: "sm:h-[clamp(240px,30vw,460px)] sm:grid-cols-3 sm:grid-rows-2",
  MOSAIC: "sm:h-[clamp(240px,30vw,460px)] sm:grid-cols-4 sm:grid-rows-2",
};

const tileSizeClasses: Record<Layout, string> = {
  SINGLE: "aspect-[3/1] sm:aspect-[5.5/1] sm:rounded-xl",
  TWO_COLUMNS: "aspect-[2.15/1] sm:aspect-[2.6/1] sm:rounded-xl",
  THREE_COLUMNS: "aspect-[16/9] sm:rounded-2xl",
  FOUR_COLUMNS: "aspect-[16/9] sm:rounded-2xl",
  TWO_BY_TWO: "aspect-[2.15/1] sm:aspect-[2.6/1] sm:rounded-xl",
  BIG_AND_TWO: "aspect-[16/9] sm:aspect-auto sm:rounded-xl",
  MOSAIC: "aspect-[16/9] sm:aspect-auto sm:rounded-xl",
};

// Where a tile goes in the mosaic-like looks: the first one is the big one (two rows tall), and in the mosaic the
// second is the wide one above the two small ones.
function placement(layout: Layout, index: number) {
  if ((layout === "BIG_AND_TWO" || layout === "MOSAIC") && index === 0) return "sm:col-span-2 sm:row-span-2";
  if (layout === "MOSAIC" && index === 1) return "sm:col-span-2";
  return "";
}

const imageSizes: Record<Layout, string> = {
  SINGLE: "100vw",
  TWO_COLUMNS: "(max-width: 640px) 100vw, 50vw",
  THREE_COLUMNS: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  FOUR_COLUMNS: "(max-width: 1024px) 50vw, 25vw",
  TWO_BY_TWO: "(max-width: 640px) 100vw, 50vw",
  BIG_AND_TWO: "(max-width: 640px) 100vw, 66vw",
  MOSAIC: "(max-width: 640px) 100vw, 50vw",
};

/**
 * The homepage's image tile rows. Tiles without a picture are left out for visitors; `editable` viewers (the page
 * builder is open to them) get them as empty slots so a freshly added row can be filled in.
 */
export function StorefrontImageTiles({ groups, editable = false }: { groups: HomepageSettings["tileGroups"]; editable?: boolean }) {
  const visibleGroups = groups.map((group) => ({ ...group, tiles: editable ? group.tiles : group.tiles.filter((tile) => tile.media) })).filter((group) => group.tiles.length);
  if (!visibleGroups.length) return null;

  return <div className="grid gap-3 sm:gap-4 lg:gap-5">
    {visibleGroups.map((group) => <div key={group.id} className={`grid gap-3 sm:gap-4 ${layoutClasses[group.layout]}`}>
      {group.tiles.map((tile, index) => {
        const className = `group relative block overflow-hidden rounded-xl bg-black/5 ${tileSizeClasses[group.layout]} ${placement(group.layout, index)}`;
        if (!tile.media) return <span key={tile.id} className={`${className} grid min-h-24 place-items-center border border-dashed border-black/15 text-[var(--muted)]`}><ImageIcon size={26} strokeWidth={1.4} aria-hidden="true" /></span>;
        return <Link key={tile.id} href={tile.href} className={className}>
          <Image src={tile.media.url} alt={tile.media.alt ?? tile.media.title ?? "تایل تصویری صفحه اصلی"} fill unoptimized={tile.media.mimeType === "image/gif"} sizes={imageSizes[group.layout]} className="object-cover transition duration-500 group-hover:scale-[1.025]" />
        </Link>;
      })}
    </div>)}
  </div>;
}
