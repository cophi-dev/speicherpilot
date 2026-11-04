import { JetBrains_Mono, Space_Grotesk } from "next/font/google";

/** Variable names stay off Tailwind's `--font-sans` so the theme token can reference them. */
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
