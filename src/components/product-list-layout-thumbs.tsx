import type { ReactNode } from "react";
import type { ProductListLayout } from "@/modules/page-builder/product-lists";

// Little drawings of the eight product-list layouts, for the picker. Drawn in a 160×120 box, white "cards" with a
// picture glyph and grey lines for text, in the spirit of a wireframe.

const line = "#c9ced6";
const glyph = "#5ea6ff";

/** A white rounded box holding the "picture" glyph. */
function Picture({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const s = Math.min(w, h) * 0.42;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} fill="#fff" />
      <g transform={`translate(${x + w / 2 - s / 2} ${y + h / 2 - s / 2}) scale(${s / 24})`} fill={glyph}>
        <circle cx="8" cy="8" r="3" />
        <path d="M2 20 9 12l4 4 3-3 6 7z" />
      </g>
    </g>
  );
}

function Lines({ x, y, w, count = 2, dark = false }: { x: number; y: number; w: number; count?: number; dark?: boolean }) {
  return <g>{Array.from({ length: count }, (_, index) => <rect key={index} x={x} y={y + index * 5} width={index === 0 ? w : w * 0.66} height={2.4} rx={1.2} fill={dark ? "#8a919c" : line} />)}</g>;
}

/** A small "thumbnail + text" item, image on the right (RTL). */
function Row({ x, y, w }: { x: number; y: number; w: number }) {
  return <g><Picture x={x + w - 14} y={y} w={14} h={14} /><Lines x={x} y={y + 2} w={w - 20} dark /></g>;
}

/** A card: picture over two lines of text. */
function Card({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <g><Picture x={x} y={y} w={w} h={h - 14} /><Lines x={x + 2} y={y + h - 11} w={w - 4} /></g>;
}

const drawings: Record<ProductListLayout, ReactNode> = {
  GRID_COMPACT: <>{[0, 1, 2].flatMap((col) => [0, 1, 2].map((row) => (
    <g key={`${col}-${row}`}>
      <Row x={10 + col * 48} y={16 + row * 32} w={44} />
      <circle cx={10 + col * 48 + 20} cy={16 + row * 32 + 7} r={3} fill="#f43f5e" />
    </g>
  )))}</>,
  SLIDER: <>
    <circle cx="20" cy="18" r="4.5" fill="#fff" /><circle cx="32" cy="18" r="4.5" fill="#fff" />
    {[0, 1, 2].map((index) => <Card key={index} x={10 + index * 48} y={32} w={42} h={70} />)}
  </>,
  FEATURE_SLIDER: <>
    <Picture x={100} y={28} w={52} h={64} />
    {[0, 1, 2].map((index) => <Card key={index} x={-16 + index * 40} y={28} w={36} h={64} />)}
  </>,
  BANNER_ROW: <>
    <Picture x={10} y={12} w={140} h={54} />
    {[0, 1, 2, 3].map((index) => <g key={index}><Picture x={116 - index * 36} y={74} w={26} h={26} /><Lines x={116 - index * 36} y={104} w={26} count={1} /></g>)}
  </>,
  FEATURE_LIST: <>
    <Picture x={92} y={22} w={58} h={76} />
    {[0, 1, 2].map((index) => <Row key={index} x={10} y={26 + index * 24} w={74} />)}
  </>,
  PANEL_SLIDER: <>
    <rect x={6} y={14} width={148} height={88} rx={6} fill="#ffffff55" />
    <Lines x={112} y={22} w={34} dark />
    <rect x={14} y={38} width={132} height={56} rx={5} fill="#fff" />
    {[0, 1, 2, 3].map((index) => <Card key={index} x={20 + index * 32} y={42} w={28} h={48} />)}
    <circle cx="14" cy="66" r="4" fill="#fff" stroke={line} /><circle cx="146" cy="66" r="4" fill="#fff" stroke={line} />
  </>,
  // Four ranked columns of three rows, as the best-selling products are laid out.
  LIST_TWO_COLUMNS: <>{[0, 1, 2, 3].flatMap((col) => [0, 1, 2].map((row) => (
    <g key={`${col}-${row}`}>
      <Row x={10 + col * 37} y={16 + row * 32} w={33} />
      <circle cx={10 + col * 37 + 15} cy={16 + row * 32 + 7} r={2.6} fill="#f43f5e" />
    </g>
  )))}{[1, 2, 3].map((col) => <rect key={col} x={6 + col * 37} y={12} width={0.8} height={96} fill={line} />)}</>,
  GROUPED_PANELS: <>{[0, 1, 2].map((panel) => (
    <g key={panel}>
      <rect x={8 + panel * 50} y={16} width={46} height={88} rx={5} fill="#f1f3f6" stroke={line} />
      {[0, 1, 2, 3].map((index) => <Card key={index} x={12 + panel * 50 + (index % 2) * 20} y={20 + Math.floor(index / 2) * 42} w={18} h={38} />)}
    </g>
  ))}</>,
};

export function ProductListLayoutThumb({ layout }: { layout: ProductListLayout }) {
  return <svg viewBox="0 0 160 120" role="img" aria-hidden="true" className="h-auto w-full">{drawings[layout]}</svg>;
}
