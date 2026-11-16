import type { Metadata } from "next";

export function resolveSiteVerification(): Metadata["verification"] | undefined {
  const google = process.env.NEXT_PUBLIC_GSC_VERIFICATION?.trim();
  const bing = process.env.NEXT_PUBLIC_BING_VERIFICATION?.trim();
  if (!google && !bing) {
    return undefined;
  }
  return {
    ...(google ? { google } : {}),
    ...(bing
      ? {
          other: {
            "msvalidate.01": bing,
          },
        }
      : {}),
  };
}