/** Natural Earth 110m admin-0 — Deutschland (vereinfacht), CC0/Public Domain. */
export const GERMANY_OUTLINE_META = {
  source: "Natural Earth 110m admin-0 countries",
  license: "CC0 / Public Domain",
  url: "https://www.naturalearthdata.com/",
} as const;

/** [lng, lat] Ring (GeoJSON-Reihenfolge). */
export const GERMANY_COUNTRY_RING_LNG_LAT: readonly (readonly [number, number])[] = [
  [14.119686, 53.757029],
  [14.353315, 53.248171],
  [14.074521, 52.981263],
  [14.4376, 52.62485],
  [14.685026, 52.089947],
  [14.607098, 51.745188],
  [15.016996, 51.106674],
  [14.570718, 51.002339],
  [14.307013, 51.117268],
  [14.056228, 50.926918],
  [13.338132, 50.733234],
  [12.966837, 50.484076],
  [12.240111, 50.266338],
  [12.415191, 49.969121],
  [12.521024, 49.547415],
  [13.031329, 49.307068],
  [13.595946, 48.877172],
  [13.243357, 48.416115],
  [12.884103, 48.289146],
  [13.025851, 47.637584],
  [12.932627, 47.467646],
  [12.62076, 47.672388],
  [12.141357, 47.703083],
  [11.426414, 47.523766],
  [10.544504, 47.566399],
  [10.402084, 47.302488],
  [9.896068, 47.580197],
  [9.594226, 47.525058],
  [8.522612, 47.830828],
  [8.317301, 47.61358],
  [7.466759, 47.620582],
  [7.593676, 48.333019],
  [8.099279, 49.017784],
  [6.65823, 49.201958],
  [6.18632, 49.463803],
  [6.242751, 49.902226],
  [6.043073, 50.128052],
  [6.156658, 50.803721],
  [5.988658, 51.851616],
  [6.589397, 51.852029],
  [6.84287, 52.22844],
  [7.092053, 53.144043],
  [6.90514, 53.482162],
  [7.100425, 53.693932],
  [7.936239, 53.748296],
  [8.121706, 53.527792],
  [8.572118, 54.395646],
  [8.526229, 54.962744],
  [9.282049, 54.830865],
  [9.921906, 54.983104],
  [9.93958, 54.596642],
  [10.950112, 54.363607],
  [10.939467, 54.008693],
  [11.956252, 54.196486],
  [12.51844, 54.470371],
  [13.647467, 54.075511],
  [14.119686, 53.757029],
];

export function germanyLngLatBounds(): { minLng: number; maxLng: number; minLat: number; maxLat: number } {
  let minLng = 180;
  let maxLng = -180;
  let minLat = 90;
  let maxLat = -90;
  for (const [lng, lat] of GERMANY_COUNTRY_RING_LNG_LAT) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return { minLng, maxLng, minLat, maxLat };
}

export function germanyOutlineSvgPath(viewW: number, viewH: number, padFrac = 0.04): string {
  const { minLng, maxLng, minLat, maxLat } = germanyLngLatBounds();
  const padLng = (maxLng - minLng) * padFrac;
  const padLat = (maxLat - minLat) * padFrac;
  const minL = minLng - padLng;
  const maxL = maxLng + padLng;
  const minA = minLat - padLat;
  const maxA = maxLat + padLat;
  const parts: string[] = [];
  for (let i = 0; i < GERMANY_COUNTRY_RING_LNG_LAT.length; i++) {
    const [lng, lat] = GERMANY_COUNTRY_RING_LNG_LAT[i]!;
    const x = ((lng - minL) / (maxL - minL)) * viewW;
    const y = ((maxA - lat) / (maxA - minA)) * viewH;
    parts.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `${parts.join(" ")} Z`;
}

export function projectSiteToSvg(
  lat: number,
  lng: number,
  viewW: number,
  viewH: number,
  padFrac = 0.04,
): { x: number; y: number } {
  const { minLng, maxLng, minLat, maxLat } = germanyLngLatBounds();
  const padLng = (maxLng - minLng) * padFrac;
  const padLat = (maxLat - minLat) * padFrac;
  const minL = minLng - padLng;
  const maxL = maxLng + padLng;
  const minA = minLat - padLat;
  const maxA = maxLat + padLat;
  return {
    x: ((lng - minL) / (maxL - minL)) * viewW,
    y: ((maxA - lat) / (maxA - minA)) * viewH,
  };
}