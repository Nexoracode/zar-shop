// Builds src/data/iran-provinces.ts — the compact province outlines behind the dashboard's order map.
//
//   node scripts/build-iran-province-map.mjs <geoBoundaries-IRN-ADM1_simplified.geojson>
//
// Source: geoBoundaries (gbOpen) Iran ADM1, https://github.com/wmgeolab/geoBoundaries, licensed
// CC BY 4.0 — the attribution string below is rendered next to the map. The script projects the
// outlines, thins them with Douglas–Peucker and writes plain SVG paths, so the app ships a few
// tens of KB instead of the ~1.2 MB source and needs no mapping library.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const input = process.argv[2];
if (!input) throw new Error("Usage: node scripts/build-iran-province-map.mjs <geojson file>");

// geoBoundaries English name -> the Persian name stored in `Province.name`.
const PERSIAN_NAMES = {
  "Alborz": "البرز", "Ardabil": "اردبیل", "Bushehr": "بوشهر", "Chaharmahal and Bakhtiari": "چهارمحال و بختیاری",
  "East Azerbaijan": "آذربایجان شرقی", "Fars": "فارس", "Gilan": "گیلان", "Golestan": "گلستان", "Hamadan": "همدان",
  "Hormozgan": "هرمزگان", "Ilam": "ایلام", "Isfahan": "اصفهان", "Kerman": "کرمان", "Kermanshah": "کرمانشاه",
  "Khuzestan": "خوزستان", "Kohgiluyeh and Boyer-Ahmad": "کهگیلویه و بویراحمد", "Kurdistan": "کردستان", "Lorestan": "لرستان",
  "Markazi": "مرکزی", "Mazandaran": "مازندران", "North Khorasan": "خراسان شمالی", "Qazvin": "قزوین", "Qom": "قم",
  "Razavi Khorasan": "خراسان رضوی", "Semnan": "سمنان", "Sistan and Baluchestan": "سیستان و بلوچستان",
  "South Khorasan": "خراسان جنوبی", "Tehran": "تهران", "West Azerbaijan": "آذربایجان غربی", "Yazd": "یزد", "Zanjan": "زنجان",
};

const WIDTH = 600;
const TOLERANCE = 0.45; // in viewBox units; larger = smaller file, blockier outline
const MIN_RING_AREA = 1.2;

const geo = JSON.parse(readFileSync(input, "utf8"));
const polygons = (geometry) => (geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates);

// Equirectangular projection scaled by cos(latitude of the country's middle), so shapes are not stretched east-west.
const allPoints = geo.features.flatMap((feature) => polygons(feature.geometry).flatMap((polygon) => polygon.flat()));
const lons = allPoints.map((point) => point[0]);
const lats = allPoints.map((point) => point[1]);
const minLon = Math.min(...lons), maxLon = Math.max(...lons), minLat = Math.min(...lats), maxLat = Math.max(...lats);
const xScale = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
const scale = WIDTH / ((maxLon - minLon) * xScale);
const HEIGHT = Math.ceil((maxLat - minLat) * scale);
const project = ([lon, lat]) => [(lon - minLon) * xScale * scale, (maxLat - lat) * scale];

function perpendicular(point, start, end) {
  const [x, y] = point, [x1, y1] = start, [x2, y2] = end;
  const dx = x2 - x1, dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  return Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / Math.hypot(dx, dy);
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  let maxDistance = 0, index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicular(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) { maxDistance = distance; index = i; }
  }
  if (maxDistance <= tolerance) return [points[0], points[points.length - 1]];
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)];
}

const area = (ring) => Math.abs(ring.reduce((sum, [x, y], i) => { const [nx, ny] = ring[(i + 1) % ring.length]; return sum + (x * ny - nx * y); }, 0)) / 2;
const centroid = (ring) => {
  let a = 0, cx = 0, cy = 0;
  ring.forEach(([x, y], i) => { const [nx, ny] = ring[(i + 1) % ring.length]; const cross = x * ny - nx * y; a += cross; cx += (x + nx) * cross; cy += (y + ny) * cross; });
  a /= 2;
  return a === 0 ? ring[0] : [cx / (6 * a), cy / (6 * a)];
};
const fmt = (n) => (Math.round(n * 10) / 10).toString();

const byName = new Map();
for (const feature of geo.features) {
  const persian = PERSIAN_NAMES[feature.properties.shapeName];
  if (!persian) throw new Error(`No Persian name mapped for "${feature.properties.shapeName}"`);
  const entry = byName.get(persian) ?? { rings: [] };
  for (const polygon of polygons(feature.geometry)) {
    for (const ring of polygon) {
      const projected = ring.map(project);
      const closed = simplify(projected, TOLERANCE);
      if (closed.length >= 4 && area(closed) >= MIN_RING_AREA) entry.rings.push(closed);
    }
  }
  byName.set(persian, entry);
}

if (byName.size !== 31) throw new Error(`Expected 31 provinces, got ${byName.size}`);

const provinces = [...byName.entries()]
  .sort((a, b) => a[0].localeCompare(b[0], "fa"))
  .map(([name, { rings }]) => {
    const [cx, cy] = centroid(rings.reduce((largest, ring) => (area(ring) > area(largest) ? ring : largest), rings[0]));
    const d = rings.map((ring) => `M${ring.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join("L")}Z`).join("");
    return { name, d, cx: Math.round(cx), cy: Math.round(cy) };
  });

const source = `// Generated by scripts/build-iran-province-map.mjs — do not edit by hand.
export const IRAN_MAP_ATTRIBUTION = "مرز استان‌ها: geoBoundaries (CC BY 4.0)";
export const IRAN_MAP_VIEW_BOX = "0 0 ${WIDTH} ${HEIGHT}";
/** \`name\` is the Persian province name exactly as stored in \`Province.name\`. */
export const IRAN_PROVINCE_SHAPES: ReadonlyArray<{ name: string; d: string; cx: number; cy: number }> = ${JSON.stringify(provinces)};
`;
mkdirSync("src/data", { recursive: true });
writeFileSync("src/data/iran-provinces.ts", source);
console.log(`provinces: ${provinces.length}, viewBox 0 0 ${WIDTH} ${HEIGHT}, output ${(source.length / 1024).toFixed(1)} KB`);
