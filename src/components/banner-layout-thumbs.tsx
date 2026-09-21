import type { ReactNode } from "react";
import type { BannerLayout } from "@/modules/page-builder/banners";

// Little wireframes of the banner looks, for the picker. A 160×120 box; white banners with a picture glyph, grey circles
// for arrows and small dots for a slider's position.

const glyph = "#5ea6ff";
const line = "#c9ced6";

function Picture({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const s = Math.min(w, h) * 0.4;
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

function Arrow({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={5} fill="#fff" stroke={line} />;
}

function Dots({ y = 96, active = 1 }: { y?: number; active?: number }) {
  return <g>{[0, 1, 2].map((index) => <circle key={index} cx={72 + index * 8} cy={y} r={index === active ? 2 : 1.4} fill={index === active ? "#8a919c" : line} />)}</g>;
}

const drawings: Record<BannerLayout, ReactNode> = {
  SLIDER_WIDE: <><Picture x={12} y={28} w={136} h={58} /><Arrow x={20} y={57} /><Arrow x={140} y={57} /><Dots /></>,
  SLIDER_CORNER: <><Picture x={12} y={26} w={136} h={62} /><Arrow x={128} y={76} /><Arrow x={116} y={76} /><Dots y={98} /></>,
  SLIDER_TWO_UP: <><Picture x={22} y={34} w={56} h={44} /><Picture x={84} y={34} w={56} h={44} /><Arrow x={16} y={56} /><Arrow x={146} y={56} /><Dots y={90} /></>,
  SLIDER_PEEK: <><Picture x={-24} y={34} w={44} h={48} /><Picture x={30} y={30} w={100} h={56} /><Picture x={140} y={34} w={44} h={48} /><Dots y={96} /></>,
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
