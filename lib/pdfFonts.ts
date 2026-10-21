import { Font } from "@react-pdf/renderer";

let registered = false;

/** IBM Plex faces used by proposal PDFs. Safe to call more than once. */
export function registerPdfFonts() {
  if (registered) {
    return;
  }
  registered = true;
  Font.register({
    family: "IBM Plex Sans",
    fonts: [
      { src: "/fonts/IBMPlexSans-Regular.ttf", fontWeight: 400 },
      { src: "/fonts/IBMPlexSans-Medium.ttf", fontWeight: 500 },
      { src: "/fonts/IBMPlexSans-SemiBold.ttf", fontWeight: 600 },
    ],
  });
  Font.register({
    family: "IBM Plex Mono",
    src: "/fonts/IBMPlexMono-Regular.ttf",
  });
  Font.registerHyphenationCallback((word) => [word]);
}
