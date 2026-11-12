#!/usr/bin/env python3
"""Capture IST, annotate Befund, inject CSS for SOLL, overlays, details states."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT = Path("/workspace/speicherpilot/forschung/design_tag_aufraeumen_v1")
SRC = ROOT / "src"
CSS = (SRC / "tag_aufraeumen.css").read_text()
RAW = Path("/tmp/tag_aufraeumen")
URL = "https://www.speicherpilot.app/tag"
DPR = 2

RUST = (180, 83, 42)
INK = (16, 18, 20)
BG = (246, 246, 243)
RED = (196, 48, 38)
BLUE = (30, 90, 160)
GREEN = (20, 110, 80)
ORANGE = (180, 100, 20)
PURPLE = (110, 50, 140)
AMBER = (170, 120, 20)


def font(size, mono=False):
    candidates = (
        [
            "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
        ]
        if mono
        else [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
        ]
    )
    bold = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for p in (bold if size >= 16 and not mono else []) + list(candidates):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def set_theme(page, dark: bool):
    page.evaluate(
        """(dark) => {
          const r = document.documentElement, b = document.body;
          r.classList.toggle('dark', dark);
          b.classList.toggle('dark', dark);
          r.style.colorScheme = dark ? 'dark' : 'light';
          r.setAttribute('data-theme', dark ? 'dark' : 'light');
          try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch(e) {}
        }""",
        dark,
    )
    page.wait_for_timeout(300)


def scroll_reveal(page):
    page.evaluate(
        """async () => {
          const h = document.documentElement.scrollHeight;
          const step = Math.max(240, Math.floor(window.innerHeight * 0.7));
          for (let y = 0; y <= h; y += step) {
            window.scrollTo(0, y);
            await new Promise(r => setTimeout(r, 70));
          }
          window.scrollTo(0, 0);
          await new Promise(r => setTimeout(r, 150));
        }"""
    )


MEASURE = r"""
() => {
  const vw = document.documentElement.clientWidth;
  const sw = document.documentElement.scrollWidth;
  const sh = document.documentElement.scrollHeight;
  const vis = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const textLeft = (el) => {
    try {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode(n) {
          if (!n.textContent.trim()) return NodeFilter.FILTER_REJECT;
          const p = n.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          const ps = getComputedStyle(p);
          if (ps.display === 'none' || ps.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      const n = w.nextNode();
      if (!n) return null;
      const rg = document.createRange();
      rg.selectNodeContents(n);
      return Math.round(rg.getBoundingClientRect().left * 10) / 10;
    } catch(e) { return null; }
  };
  const info = (el, label) => {
    if (!el) return {label, missing:true};
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      label, visible: vis(el),
      x: Math.round(r.left*10)/10,
      y: Math.round((r.top+scrollY)*10)/10,
      w: Math.round(r.width*10)/10,
      h: Math.round(r.height*10)/10,
      textLeft: textLeft(el),
      text: (el.innerText||'').trim().slice(0,80),
      fontSize: s.fontSize, fontWeight: s.fontWeight,
      paddingLeft: s.paddingLeft, maxWidth: s.maxWidth,
      color: s.color, minHeight: s.minHeight,
      className: String(el.className).slice(0,120),
    };
  };
  const qa = (s) => [...document.querySelectorAll(s)];
  const first = (s) => qa(s).find(vis) || qa(s)[0];
  const picks = {};
  const map = {
    header: 'header.site-header, header',
    headerInner: 'header.site-header > div, header > div',
    logo: 'header a.brand-lockup, header a',
    tagNav: '.v4-tag-nav',
    kicker: '.v4-kicker',
    h1: 'h1, .v4-h1',
    subline: '.v4-subline',
    riesenzahl: '.v4-riesenzahl',
    ch1num: 'section[aria-labelledby="kapitel-tag"] .v4-chapter-num',
    ch1h2: '#kapitel-tag',
    footnote: 'section[aria-labelledby="kapitel-tag"] .v4-footnote, footer.v4-footnote, .v4-footnote',
    steps: '.v4-tag-steps-desktop, .v4-st-steps',
    stepsDisc: '.v4-tag-steps-disclosure',
    ch2num: 'section[aria-labelledby="kapitel-tag-system"] .v4-chapter-num',
    ch2h2: '#kapitel-tag-system',
    kern: '.v4-tag-kern, .v4-system-pct',
    side: '.v4-tag-side',
    detailsErg: '.v4-tag-system-footnote',
    detailsErgSum: '.v4-tag-system-footnote > summary',
    markt: '.v4-markt-insights, [data-testid="markt-insights"]',
    marktTitle: '#markt-insights-title',
    ch3h2: 'section[aria-labelledby] h2.v4-chapter-h2, #kapitel-ort, .v4-chapter-h2',
    legal: '.legal-footer',
  };
  for (const [k,s] of Object.entries(map)) picks[k] = info(first(s), k);

  const contents = qa('.v4-content').filter(vis).map((el,i) => info(el, 'c'+i));
  const details = qa('details').filter(vis).map((el,i) => {
    const o = info(el, 'd'+i);
    const sm = el.querySelector('summary');
    o.open = el.open;
    o.summary = sm ? sm.innerText.trim().slice(0,80) : '';
    if (sm) {
      const sr = sm.getBoundingClientRect();
      const ss = getComputedStyle(sm);
      o.sumH = Math.round(sr.height);
      o.sumMin = ss.minHeight;
      o.sumFs = ss.fontSize;
      o.sumPad = ss.padding;
      o.sumTL = textLeft(sm);
      o.sumX = Math.round(sr.left*10)/10;
    }
    return o;
  });
  const heads = qa('h1,h2,.v4-tag-kern,.v4-system-pct,.v4-riesenzahl,.v4-tag-side,.v4-st-title,.v4-st-body,#markt-insights-title').filter(vis).map((el,i) => {
    const o = info(el, 'h'+i);
    o.inner = (el.innerText||'').trim().slice(0,70);
    return o;
  });
  return {vw, sw, sh, overflow: sw > vw+1, url: location.href,
          dark: document.documentElement.classList.contains('dark'),
          picks, contents, details, heads};
}
"""


def new_page(browser, width, height, dark):
    ctx = browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=DPR,
        color_scheme="dark" if dark else "light",
        locale="de-DE",
    )
    page = ctx.new_page()
    page.set_default_timeout(45000)
    page.goto(URL, wait_until="load", timeout=45000)
    page.wait_for_timeout(600)
    set_theme(page, dark)
    scroll_reveal(page)
    page.wait_for_timeout(200)
    return ctx, page


def shot(page, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(path), full_page=True, animations="disabled")
    return path


def capture_one(browser, width, height, dark, inject=False, open_details=False):
    ctx, page = new_page(browser, width, height, dark)
    if inject:
        page.add_style_tag(content=CSS)
        page.wait_for_timeout(250)
        scroll_reveal(page)
    if open_details:
        page.evaluate(
            """() => {
              document.querySelectorAll('details').forEach(d => { d.open = true; });
            }"""
        )
        page.wait_for_timeout(200)
    data = page.evaluate(MEASURE)
    return ctx, page, data


def draw_vline(draw, x, y0, y1, color, width=2, dash=None):
    if dash:
        y = y0
        on = True
        while y < y1:
            ny = min(y + dash, y1)
            if on:
                draw.line([(x, y), (x, ny)], fill=color, width=width)
            on = not on
            y = ny
    else:
        draw.line([(x, y0), (x, y1)], fill=color, width=width)


def annotate_befund(ist_png: Path, data: dict, out: Path, width: int, dark: bool):
    im = Image.open(ist_png).convert("RGBA")
    W, H = im.size
    scale = DPR
    # extend right for legend
    legend_w = 360 * scale // 2 if width == 390 else 300 * scale
    canvas = Image.new("RGBA", (W + legend_w, H), (20, 22, 24, 255) if dark else (236, 235, 230, 255))
    canvas.paste(im, (0, 0))
    draw = ImageDraw.Draw(canvas, "RGBA")
    f14 = font(11 * scale)
    f12 = font(10 * scale)
    f11 = font(9 * scale, mono=True)
    fB = font(13 * scale)

    def sx(x):
        return int(x * scale)

    def sy(y):
        return int(y * scale)

    picks = data["picks"]
    # collect unique textLefts of interest
    edges = []

    def add_edge(key, color, name, force_x=None):
        p = picks.get(key) or {}
        x = force_x if force_x is not None else p.get("textLeft") or p.get("x")
        if x is None or p.get("missing"):
            return
        edges.append((float(x), color, name, p))

    if width >= 768:
        # expected clusters at 32 (header), 44 (footnote), 64 (main), 81 (details), 84 (markt)
        add_edge("logo", ORANGE, "Header/Logo")
        add_edge("footnote", RED, "Fußnote Kap. 01")
        add_edge("ch2h2", GREEN, "Gemeinsame Kante (02, H2, 01)")
        add_edge("detailsErgSum", PURPLE, "details-Text (nativer Marker)")
        add_edge("marktTitle", BLUE, "Markt-Insights")
    else:
        add_edge("ch2h2", GREEN, "Gemeinsame Kante (20)")
        add_edge("stepsDisc", PURPLE, "Disclosure + nativer Marker")
        add_edge("detailsErgSum", PURPLE, "Ergänzungen + nativer Marker")
        add_edge("marktTitle", RED, "Markt-Insights (klebt am Rand)")

    h = data["sh"] * scale
    # draw vertical lines across full page
    seen_x = []
    for x, color, name, p in edges:
        px = sx(x)
        # skip almost-duplicates
        if any(abs(px - s) < 3 for s in seen_x):
            continue
        seen_x.append(px)
        col = color + (200,)
        draw_vline(draw, px, 0, H, col, width=max(2, scale), dash=8 * scale // 2)
        # top tick label
        label = f"{name}  {x:.0f}px"
        # placed at first occurrence y
        yy = sy(p.get("y") or 80)
        yy = max(8, min(yy, H - 40))
        tw = draw.textlength(label, font=f12)
        box = [px + 6, yy - 4, px + 10 + tw, yy + 16 * scale // 2 + 6]
        # if box goes off right of page (into legend it's ok)
        bgc = (255, 255, 255, 230) if not dark else (12, 14, 16, 230)
        draw.rectangle(box, fill=bgc)
        draw.rectangle(box, outline=color + (255,), width=1)
        draw.text((px + 8, yy), label, font=f12, fill=color)

    # size callouts
    def callout(key, note, color, ox=20, oy=-8):
        p = picks.get(key) or {}
        if p.get("missing") or p.get("x") is None:
            return
        x, y = sx(p["x"]), sy(p["y"])
        fs = p.get("fontSize") or ""
        text = f"{note}  {fs}"
        # leader
        lx, ly = x + sx(ox), y + sy(oy) - 4
        if lx + 200 > W:
            lx = x - sx(180)
        tw = draw.textlength(text, font=f12)
        box = [lx, ly, lx + tw + 14, ly + 18 * scale // 2 + 8]
        bgc = (255, 252, 240, 235) if not dark else (30, 22, 16, 235)
        draw.rectangle(box, fill=bgc)
        draw.rectangle(box, outline=color, width=2)
        draw.text((lx + 7, ly + 3), text, font=f12, fill=color)
        # small pointer
        draw.line([(lx, ly + 10), (x, y + 8)], fill=color, width=1)

    if width >= 768:
        callout("ch1h2", "H2 = H1  (sollte 24)", RED, ox=200, oy=8)
        callout("ch2h2", "H2 übergroß", RED, ox=280, oy=4)
        callout("kern", "Kernzahl übergroß  (sollte Display 56)", RED, ox=360, oy=20)
        callout("side", "Fließtext 14px Grau neben 96px", AMBER, ox=200, oy=8)
        callout("detailsErgSum", "natives details, Tap <44", PURPLE, ox=200, oy=-4)
    else:
        callout("ch2h2", "H2 ≈ H1, keine Hierarchie", RED, ox=10, oy=-22)
        callout("kern", "Kernzahl 52px neben 14px Grau", RED, ox=10, oy=30)
        callout("marktTitle", "Kante 0 — Text klebt", RED, ox=8, oy=-22)
        callout("detailsErgSum", "natives details, Tap <44", PURPLE, ox=8, oy=-22)

    # legend panel
    lx0 = W + 16 * scale // 2
    ink = (230, 232, 234) if dark else INK
    title = font(15 * scale)
    draw.text((lx0, 24 * scale // 2), "BEFUND  /tag", font=title, fill=ink)
    theme = "dunkel" if dark else "hell"
    draw.text((lx0, 50 * scale // 2), f"{width} px · {theme}  ·  Chromium", font=f12, fill=ink)

    y = 90 * scale // 2
    draw.text((lx0, y), "Linke Kanten (Ist)", font=fB, fill=ink)
    y += 28
    # unique measured textLefts
    items = []
    for key, name in [
        ("logo", "Header / Logo"),
        ("tagNav", "Tag-Navigation"),
        ("kicker", "Kicker / Kopf"),
        ("h1", "H1"),
        ("ch1h2", "H2 Kapitel 01"),
        ("footnote", "Fußnote Kap. 01"),
        ("steps", "Nacht/Mittag/Abend (01)"),
        ("stepsDisc", "Phasen-Disclosure"),
        ("ch2h2", "H2 Kapitel 02"),
        ("kern", "Kernzahl 8,26 GWh"),
        ("side", "Fließtext daneben"),
        ("detailsErgSum", "Ergänzungen (summary)"),
        ("marktTitle", "Markt-Insights"),
        ("legal", "Legal-Footer"),
    ]:
        p = picks.get(key) or {}
        if p.get("missing") or p.get("textLeft") is None and p.get("x") is None:
            continue
        xl = p.get("textLeft") if p.get("textLeft") is not None else p.get("x")
        items.append((name, xl, p.get("fontSize"), p.get("y")))

    for name, xl, fs, yy in items:
        draw.text((lx0, y), f"{xl:>6.1f} px   {name}", font=f11, fill=ink)
        y += 18 * scale // 2
        if fs:
            draw.text((lx0 + 80, y), f"{fs}", font=f11, fill=(120, 120, 120) if not dark else (150, 150, 150))
            y += 14 * scale // 2

    y += 16
    draw.text((lx0, y), "Größen (Ist → Soll)", font=fB, fill=ink)
    y += 26
    for line in [
        "H1          48  →  48  (bleibt)",
        "H2          48  →  24",
        "Display     96  →  56  (mobil 40)",
        "Lead        18  →  18",
        "Body/Side   14  →  16  Ink",
        "Label       12  →  12  Mono",
        "Hero-Zahl  248  — Ausnahme Kopf",
        "details Tap 21–24  →  44",
    ]:
        draw.text((lx0, y), line, font=f11, fill=ink)
        y += 18 * scale // 2

    y += 16
    draw.text((lx0, y), f"scrollWidth {data['sw']}  overflow={data['overflow']}", font=f11, fill=ink)
    y += 20
    draw.text((lx0, y), data.get("url", ""), font=f11, fill=ink)

    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(out, "PNG", optimize=True)
    print(f"  befund {out.name} {canvas.size}", flush=True)
    return out


def annotate_raster(soll_png: Path, data: dict, out: Path, width: int):
    im = Image.open(soll_png).convert("RGBA")
    W, H = im.size
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay, "RGBA")
    scale = DPR
    gutter = 48 if width >= 768 else 20
    page_max = 1248
    offset = max(0, (width - page_max) / 2)
    left = offset + gutter
    right = width - offset - gutter
    content_w = right - left
    cols = 12 if width >= 768 else 4
    cg = 24 if width >= 768 else 16
    col_w = (content_w - (cols - 1) * cg) / cols

    def sx(x):
        return int(x * scale)

    # container outer
    ox0, ox1 = sx(offset), sx(width - offset)
    # content edge
    cx0, cx1 = sx(left), sx(right)
    # shade outside content
    shade = (180, 83, 42, 28)
    if offset > 0:
        draw.rectangle([0, 0, cx0, H], fill=(20, 20, 20, 18))
        draw.rectangle([cx1, 0, W, H], fill=(20, 20, 20, 18))
    # gutter band
    draw.rectangle([sx(offset), 0, cx0, H], fill=(180, 83, 42, 35))
    draw.rectangle([cx1, 0, sx(width - offset if offset else width), H], fill=(180, 83, 42, 35))
    # left edge emphasized
    draw.line([(cx0, 0), (cx0, H)], fill=(180, 83, 42, 230), width=3)
    draw.line([(cx1, 0), (cx1, H)], fill=(180, 83, 42, 120), width=2)
    # columns
    x = left
    for i in range(cols):
        a, b = sx(x), sx(x + col_w)
        if i % 2 == 0:
            draw.rectangle([a, 0, b, H], fill=(16, 18, 20, 18))
        draw.line([(a, 0), (a, H)], fill=(16, 90, 140, 90), width=1)
        draw.line([(b, 0), (b, H)], fill=(16, 90, 140, 90), width=1)
        x += col_w + cg

    composed = Image.alpha_composite(im, overlay)
    d2 = ImageDraw.Draw(composed)
    f = font(12 * scale // 1)
    f11 = font(10 * scale)
    ink = INK
    # legend bar at very top, drawn on a strip? put a floating label
    label = (
        f"Raster  {width}px   max {page_max}   Außen {offset:.0f}   Gutter {gutter}   "
        f"Kante {left:.0f}   Inhalt {content_w:.0f}   {cols} Spalten à {col_w:.1f}  + Gutter {cg}"
    )
    tw = d2.textlength(label, font=f11)
    pad = 10
    box = [cx0 + 8, 8, cx0 + 16 + tw, 8 + 22]
    d2.rectangle(box, fill=(246, 246, 243, 230))
    d2.rectangle(box, outline=RUST, width=1)
    d2.text((cx0 + 12, 11), label, font=f11, fill=ink)
    # edge caption
    cap = f"linke Kante  {left:.0f} px"
    d2.text((cx0 + 8, 40), cap, font=f, fill=RUST)

    out.parent.mkdir(parents=True, exist_ok=True)
    composed.convert("RGB").save(out, "PNG", optimize=True)
    print(f"  raster {out.name} {composed.size} edge={left} col={col_w:.2f}", flush=True)


def details_panel(closed_png: Path, open_png: Path, data_c, data_o, out: Path, width=1280):
    """Stack closed/open crops of the Ergänzungen region."""
    imc = Image.open(closed_png).convert("RGB")
    imo = Image.open(open_png).convert("RGB")
    scale = DPR

    def region(data, im):
        p = data["picks"].get("detailsErg") or data["picks"].get("ch2h2") or {}
        y = p.get("y") or 2300
        # include from chapter 02 h2 through markt start
        y0 = (data["picks"].get("ch2h2") or {}).get("y") or (y - 200)
        y1 = (data["picks"].get("markt") or {}).get("y") or (y + 200)
        # some padding
        top = max(0, int((y0 - 40) * scale))
        bot = min(im.size[1], int((y1 + 40) * scale))
        # if open, go further
        return im.crop((0, top, min(im.size[0], width * scale), bot))

    c = region(data_c, imc)
    o = region(data_o, imo)
    # labels
    f = font(18)
    fb = font(22)
    gap = 48
    lab_h = 48
    W = max(c.size[0], o.size[0])
    H = lab_h + c.size[1] + gap + lab_h + o.size[1] + 24
    canvas = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(canvas)
    d.text((32, 12), "ZU  —  Ergänzungen geschlossen", font=fb, fill=INK)
    canvas.paste(c, (0, lab_h))
    y = lab_h + c.size[1] + 8
    d.line([(0, y + 8), (W, y + 8)], fill=(218, 218, 211), width=1)
    d.text((32, y + 16), "OFFEN  —  Ergänzungen + Phasen (Inhalt unverändert)", font=fb, fill=INK)
    canvas.paste(o, (0, y + 16 + lab_h - 8))
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, "PNG", optimize=True)
    print(f"  details {out.name} {canvas.size}", flush=True)


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    ROOT.mkdir(parents=True, exist_ok=True)
    jobs = [
        # (width, height, dark, name)
        (1280, 800, False, "1280_hell"),
        (1280, 800, True, "1280_dunkel"),
        (390, 844, False, "390_hell"),
        (390, 844, True, "390_dunkel"),
    ]
    measures = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # IST
        for w, h, dark, name in jobs:
            print(f"=== IST {name} ===", flush=True)
            try:
                ctx, page, data = capture_one(browser, w, h, dark, inject=False)
            except Exception as e:
                print(f"  FAIL {e}", flush=True)
                continue
            ip = RAW / f"ist_{name}.png"
            shot(page, ip)
            (RAW / f"measure_ist_{name}.json").write_text(json.dumps(data, indent=2, ensure_ascii=False))
            print(f"  overflow={data['overflow']} sw={data['sw']} sh={data['sh']} url={data['url']}", flush=True)
            annotate_befund(ip, data, ROOT / f"befund_{name}.png", w, dark)
            measures[f"ist_{name}"] = data
            ctx.close()

        # SOLL
        for w, h, dark, name in jobs:
            print(f"=== SOLL {name} ===", flush=True)
            try:
                ctx, page, data = capture_one(browser, w, h, dark, inject=True)
            except Exception as e:
                print(f"  FAIL {e}", flush=True)
                continue
            sp = ROOT / f"soll_{name}.png"
            shot(page, sp)
            (RAW / f"measure_soll_{name}.json").write_text(json.dumps(data, indent=2, ensure_ascii=False))
            print(f"  overflow={data['overflow']} sw={data['sw']} sh={data['sh']}", flush=True)
            # print edges for QA
            print("  EDGES:", flush=True)
            for k, v in data["picks"].items():
                if v.get("missing"):
                    continue
                print(f"    {k:16} tL={v.get('textLeft')}  fs={v.get('fontSize')}  minH={v.get('minHeight')}  y={v.get('y')}  {str(v.get('text'))[:40]}", flush=True)
            measures[f"soll_{name}"] = data
            if name in ("1280_hell", "390_hell"):
                annotate_raster(sp, data, ROOT / f"raster_overlay_{w}.png", w)
            ctx.close()

        # details zu/offen — 1280 hell soll
        print("=== DETAILS zu/offen ===", flush=True)
        ctx, page, data_c = capture_one(browser, 1280, 800, False, inject=True, open_details=False)
        closed = RAW / "soll_details_zu.png"
        shot(page, closed)
        ctx.close()
        ctx, page, data_o = capture_one(browser, 1280, 800, False, inject=True, open_details=True)
        opened = RAW / "soll_details_offen.png"
        shot(page, opened)
        # also dump summary heights
        print("  CLOSED details", json.dumps([{k: d.get(k) for k in ('summary','sumH','sumMin','sumFs','sumTL','sumX','open')} for d in data_c['details']], ensure_ascii=False), flush=True)
        print("  OPEN details", json.dumps([{k: d.get(k) for k in ('summary','sumH','sumMin','sumFs','sumTL','sumX','open')} for d in data_o['details']], ensure_ascii=False), flush=True)
        details_panel(closed, opened, data_c, data_o, ROOT / "details_zu_offen.png")
        measures["details_zu"] = data_c
        measures["details_offen"] = data_o
        ctx.close()

        browser.close()

    (RAW / "all_measures.json").write_text(json.dumps({
        k: {kk: vv for kk, vv in v.items() if kk in ("vw","sw","sh","overflow","url","dark","picks","details","heads")}
        for k, v in measures.items()
    }, indent=2, ensure_ascii=False, default=str))
    print("DONE")


if __name__ == "__main__":
    main()
