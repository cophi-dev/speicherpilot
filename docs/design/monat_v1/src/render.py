#!/usr/bin/env python3
"""Playwright: erst scrollen, dann Full-Page. scrollWidth-Overflow prüfen."""
from pathlib import Path
from playwright.sync_api import sync_playwright

SRC = Path(__file__).resolve().parent
OUT = SRC.parent

JOBS = [
    # (html, png, viewport_w, viewport_h)
    ("g1_390_light.html", "g1_hero_390_light.png", 390, 844),
    ("g1_390_dark.html", "g1_hero_390_dark.png", 390, 844),
    ("g1_1280_light.html", "g1_hero_1280_light.png", 1280, 900),
    ("g1_1280_dark.html", "g1_hero_1280_dark.png", 1280, 900),
    ("g3_390_light.html", "g3_stunden_390_light.png", 390, 844),
    ("g3_390_dark.html", "g3_stunden_390_dark.png", 390, 844),
    ("g3_1280_light.html", "g3_stunden_1280_light.png", 1280, 900),
    ("g3_1280_dark.html", "g3_stunden_1280_dark.png", 1280, 900),
    ("g4_390_light.html", "g4_ueberschuss_390_light.png", 390, 844),
    ("g4_390_dark.html", "g4_ueberschuss_390_dark.png", 390, 844),
    ("g4_1280_light.html", "g4_ueberschuss_1280_light.png", 1280, 900),
    ("g4_1280_dark.html", "g4_ueberschuss_1280_dark.png", 1280, 900),
    ("seite_390_light.html", "seite_390_light.png", 390, 844),
    ("seite_390_dark.html", "seite_390_dark.png", 390, 844),
    ("seite_1280_light.html", "seite_1280_light.png", 1280, 900),
    ("seite_1280_dark.html", "seite_1280_dark.png", 1280, 900),
    ("uebersicht.html", "uebersicht.png", 1280, 900),
]

CHK = """() => {
  const w = document.documentElement.clientWidth;
  const sw = document.documentElement.scrollWidth;
  const bw = document.body.scrollWidth;
  const overflowing = [];
  for (const e of document.querySelectorAll('*')) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > w + 1.5) {
      const t = (e.textContent || '').trim().slice(0, 40).replace(/\\s+/g, ' ');
      overflowing.push({
        tag: e.tagName, cls: (e.className||'').toString().slice(0,40),
        right: Math.round(r.right*10)/10, text: t,
        fw: e.getAttribute('font-size')
      });
    }
  }
  const texts = [...document.querySelectorAll('text, p, h1, h2, th, td, span, figcaption, .lbl, .fig, .eb-text, .chip, .lead, .disclaimer')];
  const small = [];
  for (const e of texts) {
    const fs = parseFloat(getComputedStyle(e).fontSize) || parseFloat(e.getAttribute('font-size')||'0');
    if (fs && fs < 12 && (e.getBoundingClientRect().width > 0)) {
      small.push({fs, t: (e.textContent||'').trim().slice(0,30)});
    }
  }
  return {w, sw, bw, overflow: sw > w + 1, overflowing: overflowing.slice(0, 20), nOverflow: overflowing.length, small};
}"""

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ok = True
        for html, png, vw, vh in JOBS:
            page = browser.new_page(viewport={"width": vw, "height": vh}, device_scale_factor=2)
            page.goto((SRC / html).as_uri(), wait_until="load")
            page.wait_for_timeout(200)
            # erst scrollen
            page.evaluate("() => window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(150)
            page.evaluate("() => window.scrollTo(0, 0)")
            page.wait_for_timeout(150)
            info = page.evaluate(CHK)
            flag = "OK" if not info["overflow"] and not info["small"] else "ISSUE"
            if info["overflow"] or info["small"]:
                ok = False
            print(f"{flag} {png}  sw={info['sw']} cw={info['w']}  nOv={info['nOverflow']} small={info['small']}")
            if info["overflowing"]:
                for o in info["overflowing"][:8]:
                    print(f"    overflow: {o}")
            # full page
            page.screenshot(path=str(OUT / png), full_page=True, animations="disabled")
            page.close()
        browser.close()
        print("ALL_OK" if ok else "HAS_ISSUES")

if __name__ == "__main__":
    main()
