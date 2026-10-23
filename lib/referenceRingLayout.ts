import { HOUR_LABEL_PAD_PX, pxToUser } from "@/lib/dayRingScale";

/** Gap from the clear zone to the fixed inner edge of the state-of-charge ring. */
export const REFERENCE_SOC_EDGE_GAP_PX = 6;
/** Power band stays this far outside the state-of-charge ring at 100 %. */
export const REFERENCE_BAND_GAP_PX = 8;
/** Phone frame from the hero rule `min(358px, 100vw - 16px)`. */
export const REFERENCE_NARROW_FRAME_PX = 358;

export type ReferenceRingCss = {
  narrow: boolean;
  clearPx: number;
  innerEdgePx: number;
  tMinPx: number;
  t100Px: number;
  /** Disk radius inside the hour-label pad, in CSS px. */
  diskPx: number;
  socOuter100Px: number;
  bandInnerPx: number;
  bandOuterPx: number;
  zeroPx: number;
  thicknessPx: (soc: number) => number;
};

/**
 * CSS-pixel geometry for the reference ring.
 * Narrow frames use the 390 sizes and a band on 0.43–0.95 of the disk.
 * The inner band edge never comes closer than 8 px to the ring at 100 %.
 */
export function referenceRingCss(framePx: number): ReferenceRingCss {
  const narrow = framePx < 480;
  const clearPx = narrow ? 44 : 58;
  const tMinPx = narrow ? 3 : 4;
  const t100Px = narrow ? 8 : 14;
  const innerEdgePx = clearPx + REFERENCE_SOC_EDGE_GAP_PX;
  const thicknessPx = (soc: number) => {
    const share = Math.min(1, Math.max(0, soc));
    return Math.max(tMinPx, share * t100Px);
  };
  const socOuter100Px = innerEdgePx + thicknessPx(1);
  const padFrac = framePx >= 320 ? (2 * HOUR_LABEL_PAD_PX) / framePx : 0;
  const diskPx = (framePx / 2) * (1 - padFrac);
  const bandOuterPx = 0.95 * diskPx;
  const preferredInner = narrow ? 0.43 * diskPx : socOuter100Px + REFERENCE_BAND_GAP_PX;
  const bandInnerPx = Math.max(preferredInner, socOuter100Px + REFERENCE_BAND_GAP_PX);
  return {
    narrow,
    clearPx,
    innerEdgePx,
    tMinPx,
    t100Px,
    diskPx,
    socOuter100Px,
    bandInnerPx,
    bandOuterPx,
    zeroPx: (bandInnerPx + bandOuterPx) / 2,
    thicknessPx,
  };
}

/** Frame width the hero gives the ring at a viewport width. */
export function referenceFramePx(viewportPx: number): number {
  if (viewportPx <= 767) {
    return Math.min(REFERENCE_NARROW_FRAME_PX, Math.max(1, viewportPx - 16));
  }
  const content = Math.max(1, viewportPx - 64);
  return Math.min(720, content * (1.1 / 2.1));
}

export type ReferenceRingUser = {
  css: ReferenceRingCss;
  innerEdge: number;
  socOuter100: number;
  bandInner: number;
  bandOuter: number;
  zero: number;
  thickness: (soc: number) => number;
};

/** Same geometry in viewBox units, from the rendered SVG width. */
export function referenceRingUser(framePx: number, viewWidth: number): ReferenceRingUser {
  const css = referenceRingCss(framePx);
  const toUser = (px: number) => pxToUser(px, viewWidth, framePx);
  return {
    css,
    innerEdge: toUser(css.innerEdgePx),
    socOuter100: toUser(css.socOuter100Px),
    bandInner: toUser(css.bandInnerPx),
    bandOuter: toUser(css.bandOuterPx),
    zero: toUser(css.zeroPx),
    thickness: (soc: number) => toUser(css.thicknessPx(soc)),
  };
}
