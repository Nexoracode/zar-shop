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

/** A product card: the picture, the words "product title" and two lines (the price) under it. */
function Card({ x, y, w, h, label = true }: { x: number; y: number; w: number; h: number; label?: boolean }) {
  const pictureHeight = label ? h - 20 : h - 14;
  return (
    <g>
      <Picture x={x} y={y} w={w} h={pictureHeight} />
      {label && <text x={x + w / 2} y={y + pictureHeight + 6} fontSize={4.2} textAnchor="middle" fill="#6b7280" direction="rtl">عنوان محصول</text>}
      <Lines x={x + 2} y={y + h - (label ? 8 : 11)} w={w - 4} />
    </g>
  );
}

/** A round arrow button with a chevron. */
function RoundArrow({ x, y, side }: { x: number; y: number; side: "right" | "left" }) {
  const d = side === "right" ? "M-1 -2 1.2 0 -1 2" : "M1 -2 -1.2 0 1 2";
  return <g><circle cx={x} cy={y} r={4.6} fill="#fff" stroke={line} /><path d={d} transform={`translate(${x} ${y})`} fill="none" stroke="#6b7280" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" /></g>;
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
  // The big picture on the right, the cards continuing to its left (the last one is cut by the edge, like a slider).
  FEATURE_SLIDER: <>
    <Picture x={104} y={26} w={50} h={70} />
    {[0, 1, 2].map((index) => <Card key={index} x={66 - index * 37} y={26} w={33} h={70} />)}
  </>,
  // One row: the banner on the right, small product cards to its left.
  BANNER_ROW: <>
    <Picture x={72} y={32} w={82} h={56} />
    {[0, 1, 2].map((index) => <Card key={index} x={50 - index * 23} y={44} w={20} h={44} />)}
  </>,
  // The banner on the right, two columns of horizontal cards to its left.
  FEATURE_LIST: <>
    <Picture x={96} y={24} w={54} h={74} />
    {[0, 1].flatMap((col) => [0, 1, 2].map((row) => <Row key={`${col}-${row}`} x={8 + col * 44} y={28 + row * 24} w={40} />))}
  </>,
  // A colored panel: the title and a line of description on the right, the cards in a light strip with arrows at its edges.
  PANEL_SLIDER: <>
    <rect x={6} y={12} width={148} height={98} rx={6} fill="#d8dbe0" />
    <text x={148} y={27} fontSize={8.5} fontWeight={700} textAnchor="end" fill="#3f4652" direction="rtl">عنوان</text>
    <rect x={116} y={32} width={32} height={2.6} rx={1.3} fill="#9aa1ac" />
    <rect x={12} y={42} width={136} height={62} rx={5} fill="#f3f4f6" />
    {[0, 1, 2, 3].map((index) => <Card key={index} x={119 - index * 32} y={47} w={27} h={52} />)}
    <RoundArrow x={12} y={73} side="left" />
    <RoundArrow x={148} y={73} side="right" />
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
