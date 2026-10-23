import { IBM_Plex_Mono, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";

/** Variable names stay off Tailwind's `--font-sans` so the theme token can reference them. */
export const plexSans = IBM_Plex_Sans({
  subsets: ["latin", "greek"],
  weight: ["300", "400", "500", "600"],
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
  weight: ["400"],
  variable: "--font-jetbrains",
  display: "swap",
});
