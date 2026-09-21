import type { ReactNode } from "react";
import type { BannerLayout } from "@/modules/page-builder/banners";

// Little wireframes of the banner looks, for the picker. A 160×120 box; white banners with a picture glyph, grey circles
// for arrows and small dots for a slider's position.

const glyph = "#5ea6ff";
const line = "#c9ced6";

function Picture({ x, y, w, h, rx = 4 }: { x: number; y: number; w: number; h: number; rx?: number }) {
  const s = Math.min(w, h) * 0.4;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="#fff" />
      <g transform={`translate(${x + w / 2 - s / 2} ${y + h / 2 - s / 2}) scale(${s / 24})`} fill={glyph}>
        <circle cx="8" cy="8" r="3" />
        <path d="M2 20 9 12l4 4 3-3 6 7z" />
      </g>
    </g>
  );
}

// The arrows and dots of the main slider: dark translucent round buttons with a white chevron, and the dots in a small
// translucent pill over the bottom of the picture.
function Arrow({ x, y, side }: { x: number; y: number; side: "right" | "left" }) {
  const d = side === "right" ? "M-1.3 -2.2 1.3 0 -1.3 2.2" : "M1.3 -2.2 -1.3 0 1.3 2.2";
  return (
    <g>
      <circle cx={x} cy={y} r={5.5} fill="#000" fillOpacity={0.3} stroke="#fff" strokeOpacity={0.6} />
      <path d={d} transform={`translate(${x} ${y})`} fill="none" stroke="#fff" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function Dots({ y = 78, active = 1 }: { y?: number; active?: number }) {
  return (
    <g>
      <rect x={62} y={y - 5} width={36} height={10} rx={5} fill="#000" fillOpacity={0.22} />
      {[0, 1, 2].map((index) => index === active
        ? <rect key={index} x={73} y={y - 1.5} width={7} height={3} rx={1.5} fill="#fff" />
        : <circle key={index} cx={index < active ? 68 : 90} cy={y} r={1.6} fill="#fff" fillOpacity={0.6} />)}
    </g>
  );
}

// The full-width look touches both edges of the box (the others keep a margin, like the store's content width), with
// guides at the margins so the difference reads at a glance.
const drawings: Record<BannerLayout, ReactNode> = {
  SLIDER_FULL: <><line x1={8} y1={14} x2={8} y2={106} stroke={line} strokeDasharray="2 3" /><line x1={152} y1={14} x2={152} y2={106} stroke={line} strokeDasharray="2 3" /><Picture x={0} y={28} w={160} h={58} rx={0} /><Arrow x={12} y={57} side="right" /><Arrow x={148} y={57} side="left" /><Dots /></>,
  SLIDER_WIDE: <><Picture x={12} y={28} w={136} h={58} /><Arrow x={23} y={57} side="right" /><Arrow x={137} y={57} side="left" /><Dots /></>,
  SLIDER_CORNER: <><Picture x={12} y={26} w={136} h={62} /><Arrow x={137} y={77} side="right" /><Arrow x={124} y={77} side="left" /><Dots y={79} /></>,
  SLIDER_TWO_UP: <><Picture x={22} y={34} w={56} h={44} /><Picture x={84} y={34} w={56} h={44} /><Arrow x={31} y={56} side="right" /><Arrow x={131} y={56} side="left" /><Dots y={70} /></>,
  SLIDER_PEEK: <><Picture x={-24} y={34} w={44} h={48} /><Picture x={30} y={30} w={100} h={56} /><Picture x={140} y={34} w={44} h={48} /><Dots /></>,
  SINGLE: <Picture x={12} y={44} w={136} h={32} />,
  TWO_COLUMNS: <><Picture x={12} y={38} w={68} h={44} /><Picture x={84} y={38} w={68} h={44} /></>,
  BIG_AND_TWO: <><Picture x={64} y={28} w={88} h={64} /><Picture x={8} y={28} w={50} h={30} /><Picture x={8} y={62} w={50} h={30} /></>,
  FOUR_COLUMNS: <>{[0, 1, 2, 3].map((index) => <Picture key={index} x={8 + index * 38} y={46} w={34} h={30} />)}</>,
  MOSAIC: <><Picture x={64} y={26} w={88} h={68} /><Picture x={8} y={26} w={50} h={30} /><Picture x={8} y={62} w={24} h={32} /><Picture x={34} y={62} w={24} h={32} /></>,
  THREE_COLUMNS: <>{[0, 1, 2].map((index) => <Picture key={index} x={8 + index * 50} y={40} w={46} h={40} />)}</>,
  TWO_BY_TWO: <><Picture x={12} y={22} w={68} h={34} /><Picture x={84} y={22} w={68} h={34} /><Picture x={12} y={62} w={68} h={34} /><Picture x={84} y={62} w={68} h={34} /></>,
};

export function BannerLayoutThumb({ layout }: { layout: BannerLayout }) {
  return <svg viewBox="0 0 160 120" role="img" aria-hidden="true" className="h-auto w-full overflow-hidden">{drawings[layout]}</svg>;
}
