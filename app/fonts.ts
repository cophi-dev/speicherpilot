import { IBM_Plex_Mono, IBM_Plex_Sans, JetBrains_Mono, Space_Grotesk } from "next/font/google";

/** Variable names stay off Tailwind's `--font-sans` so the theme token can reference them. */
export const plexSans = IBM_Plex_Sans({
  subsets: ["latin", "greek"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-plex-sans",
  display: "swap",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-space-grotesk",
  display: "swap",
});
