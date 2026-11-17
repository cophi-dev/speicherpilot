import { nearestIndexFromXs } from "@/lib/chartNearestIndex";

export function clientToSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  if (typeof svg.createSVGPoint !== "function" || typeof svg.getScreenCTM !== "function") {
    return null;
  }
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return null;
  }
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const local = pt.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

export function nearestIndexFromSvgX(svgX: number, xs: readonly number[]): number {
  return nearestIndexFromXs(svgX, xs);
}

export function nearestIndexFromClientInSvg(
  clientX: number,
  clientY: number,
  svg: SVGSVGElement | null | undefined,
  xs: readonly number[],
): number {
  if (!svg || xs.length === 0) {
    return 0;
  }
  const pt = clientToSvgPoint(svg, clientX, clientY);
  if (!pt) {
    return 0;
  }
  return nearestIndexFromSvgX(pt.x, xs);
}