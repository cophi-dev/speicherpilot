import Link from "next/link";

/** Artboard height of the approved lockup SVGs (viewBox height). */
const VIEWBOX_HEIGHT = 32;
/** Header and anything below the regular cut use the Plex 400 “klein” files. */
const REGULAR_FROM = 32;
const MIN_HEIGHT = 20;

const KLEIN_VIEWBOX_WIDTH = 160.94;
const REGULAR_VIEWBOX_WIDTH = 158.61;

export const HEADER_LOCKUP_HEIGHT = 24;
export const BRAND_HOME_LABEL = "SpeicherPilot, Startseite";

export function lockupAsset(height: number) {
  const resolved = Math.max(MIN_HEIGHT, height);
  const klein = resolved < REGULAR_FROM;
  const viewBoxWidth = klein ? KLEIN_VIEWBOX_WIDTH : REGULAR_VIEWBOX_WIDTH;
  const suffix = klein ? "-klein" : "";
  return {
    height: resolved,
    width: (viewBoxWidth * resolved) / VIEWBOX_HEIGHT,
    srcHell: `/brand/logo-c-hell${suffix}.svg`,
    srcDunkel: `/brand/logo-c-dunkel${suffix}.svg`,
  };
}

type BrandLockupProps = {
  /** Nominal lockup height H in px. Minimum 20. From 32 the regular Plex 300 files are used. */
  height?: number;
};

/**
 * Approved Logo-C lockup. The two theme files stay separate documents so their
 * gradient ids never collide. Which one is visible is decided in CSS: `.dark`
 * shows the dark-background file, including while the header sits on a dark hero.
 */
export function BrandLockup({ height = HEADER_LOCKUP_HEIGHT }: BrandLockupProps) {
  const asset = lockupAsset(height);
  const clearSpace = asset.height / 2;

  return (
    <Link
      href="/"
      aria-label={BRAND_HOME_LABEL}
      className="brand-lockup inline-flex shrink-0 items-center"
      style={{
        padding: clearSpace,
        margin: -clearSpace,
        minHeight: 44,
        minWidth: 44,
      }}
    >
      <span className="brand-lockup__frame" style={{ height: asset.height, width: asset.width }}>
        {/* Approved SVGs are served unchanged. next/image does not optimize SVG. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="brand-lockup__hell"
          src={asset.srcHell}
          alt=""
          width={asset.width}
          height={asset.height}
          aria-hidden="true"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="brand-lockup__dunkel"
          src={asset.srcDunkel}
          alt=""
          width={asset.width}
          height={asset.height}
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}
