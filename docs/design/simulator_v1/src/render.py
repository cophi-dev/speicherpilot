#!/usr/bin/env python3
"""Playwright: erst scrollen, dann Full-Page + erste Falte. scrollWidth, Schrift, Overflow."""
from pathlib import Path
from playwright.sync_api import sync_playwright

SRC = Path(__file__).resolve().parent
OUT = SRC.parent

# (html, png, vw, vh, full_page, suffix handled in name)
JOBS = []

def add(html, png, w, h, full=True):
    JOBS.append((html, png, w, h, full))

for w, h in ((390, 844), (1280, 800)):
    for th in ("light", "dark"):
        add(f"seite_{w}_{th}.html", f"seite_{w}_{th}.png", w, h, True)
        add(f"seite_{w}_{th}.html", f"seite_{w}_{th}_falte.png", w, h, False)
        add(f"hero_{w}_{th}.html", f"g1_hero_{w}_{th}.png", w, h, True)

for w, h in ((390, 844), (1280, 800)):
    for st in ("erloes", "kompromiss", "netz"):
        add(f"schieber_{st}_{w}_light.html", f"schieber_{st}_{w}_light.png", w, h, True)

add("uebersicht.html", "uebersicht.png", 1280, 800, True)

CHK = """() => {
  const w = document.documentElement.clientWidth;
  const sw = document.documentElement.scrollWidth;
  const overflowing = [];
  for (const e of document.querySelectorAll('*')) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > w + 1.5) {
      const t = (e.textContent || '').trim().slice(0, 50).replace(/\\s+/g, ' ');
      overflowing.push({tag: e.tagName, cls: (e.className||'').toString().slice(0,40),
        right: Math.round(r.right*10)/10, text: t, fs: e.getAttribute('font-size')});
    }
  }
  const texts = [...document.querySelectorAll('text, p, h1, h2, h3, th, td, span, figcaption, a, button, dt, dd, .lbl, .fig, .kicker, .chip, .lead, .display, .num, .slider-hint, .foot, .wordmark')];
  const small = [];
  for (const e of texts) {
    const fs = parseFloat(getComputedStyle(e).fontSize) || parseFloat(e.getAttribute('font-size')||'0');
    if (fs && fs < 11.95 && (e.getBoundingClientRect().width > 0) && (e.textContent||'').trim()) {
      small.push({fs, t: (e.textContent||'').trim().slice(0,40)});
    }
  }
  // SVG text bboxes
  const svgTexts = [...document.querySelectorAll('text')].map(e => {
    let b = null;
    try { b = e.getBBox(); } catch (err) {}
    const r = e.getBoundingClientRect();
    return {t: (e.textContent||'').trim().slice(0,40), x: b && b.x, y: b && b.y, w: b && b.width, h: b && b.height,
            right: r.right, left: r.left, fs: parseFloat(e.getAttribute('font-size')||'12')};
  });
  return {w, sw, overflow: sw > w + 1, overflowing: overflowing.slice(0, 16), nOverflow: overflowing.length, small, svgTexts};
}"""


def main():
    # generate html first
    import gen
    gen.write_all()
    OUT.mkdir(parents=True, exist_ok=True)
    qa = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ok = True
        seen = set()
        for html, png, vw, vh, full in JOBS:
            page = browser.new_page(viewport={"width": vw, "height": vh}, device_scale_factor=2)
            page.goto((SRC / html).as_uri(), wait_until="load")
            page.wait_for_timeout(250)
            page.evaluate("() => window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(120)
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
            if full:
                page.screenshot(path=str(OUT / png), full_page=True, animations="disabled")
            else:
                page.screenshot(path=str(OUT / png), full_page=False, animations="disabled")
            # store svg bboxes once per html
            if html not in seen:
                seen.add(html)
                qa.append({"html": html, "png": png, "w": vw, **{k: info[k] for k in ("sw","overflow","nOverflow","small")}})
            page.close()
        browser.close()
        print("ALL_OK" if ok else "HAS_ISSUES")
        import json
        (OUT / "_qa_measures.json").write_text(json.dumps(qa, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
