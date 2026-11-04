import { Font } from "@react-pdf/renderer";

let registered = false;

/** Space Grotesk / JetBrains Mono for proposal PDFs. Safe to call more than once. */
export function registerPdfFonts() {
  if (registered) {
    return;
  }
  registered = true;
  Font.register({
    family: "Space Grotesk",
    fonts: [
      { src: "/fonts/SpaceGrotesk-Regular.ttf", fontWeight: 400 },
      { src: "/fonts/SpaceGrotesk-Medium.ttf", fontWeight: 500 },
    ],
  });
  Font.register({
    family: "JetBrains Mono",
    src: "/fonts/JetBrainsMono-Regular.ttf",
  });
  Font.registerHyphenationCallback((word) => [word]);
}
