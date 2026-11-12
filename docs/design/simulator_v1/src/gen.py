# -*- coding: utf-8 -*-
"""Vorentwurf Simulator Fahrweisen — HTML/SVG-Skizzen. Kein Produkt-Code."""
from __future__ import annotations

import html as htmlmod
from pathlib import Path

import data as D

SRC = Path(__file__).resolve().parent
OUT = SRC  # html next to gen; PNGs go to parent via render.py
ROOT = SRC.parent

FONT_SANS = "/usr/share/fonts/truetype/sand-box/google/Space Grotesk/SpaceGrotesk-VariableFont_wght.ttf"
FONT_MONO = "/usr/share/fonts/truetype/sand-box/google/JetBrains Mono/JetBrainsMono-VariableFont_wght.ttf"

# Hex only — never var(--foreground). Lesson #99.
THEME = {
    "light": dict(
        bg="#F6F6F3", ink="#101214", muted="#43474C", linie="#DADAD3",
        flaeche="#FFFFFF", grid="#E4E4DC", rust="#B4532A",
        rust_tint="rgba(180,83,42,0.10)", rust_tint2="rgba(180,83,42,0.18)",
        field="rgba(27,107,69,0.10)",
        win="#1B6B45", schwach="#8B5A1A", schwach_fill="#C9A46A",
        neutral_fill="#D5D5CD", hebung="#B4532A",
        soc="rgba(16,18,20,0.06)",
    ),
    "dark": dict(
        bg="#0B0D0F", ink="#E9EEF2", muted="#9EA3A9", linie="#262B31",
        flaeche="#121417", grid="#1F2529", rust="#B4532A",
        rust_tint="rgba(180,83,42,0.20)", rust_tint2="rgba(180,83,42,0.28)",
        field="rgba(90,180,140,0.12)",
        win="#6FBF93", schwach="#E0B066", schwach_fill="#8B5A1A",
        neutral_fill="#2A2E32", hebung="#B4532A",
        soc="rgba(233,238,242,0.06)",
    ),
}

FRONT = D.unique_front_x2()
DAYS = D.tagesklassen()
# Snap index of named stops
IDX = {p["name"]: i for i, p in enumerate(FRONT) if p["name"]}
# markt=0, kompromiss=8, netz=17, eps50=5, eps90=13

ZOOM_X = (33.70, 34.18)
FULL_X = (0.0, 36.0)
Y_RNG = (0.0, 4.20)

STATES = {
    "kompromiss": dict(idx=IDX["kompromiss"], title="Kompromiss"),
    "erloes": dict(idx=IDX["markt"], title="Max. Erlös"),
    "netz": dict(idx=IDX["netz"], title="Netzdienlich"),
}


def esc(s):
    return htmlmod.escape(str(s), quote=True)


def css(theme: str, width: int) -> str:
    t = THEME[theme]
    gutter = 20 if width <= 500 else (48 if width < 1280 else 64)
    inner = width - 2 * gutter
    h1 = 32 if width < 768 else 48
    h2 = 24 if width < 768 else 32
    lead = 16 if width < 768 else 18
    disp = 40 if width < 768 else 56
    insight = 24 if width < 768 else 32
    return f"""
@font-face{{font-family:'Space Grotesk';src:url('file://{FONT_SANS}') format('truetype');font-weight:300 700;font-style:normal;font-display:block}}
@font-face{{font-family:'JetBrains Mono';src:url('file://{FONT_MONO}') format('truetype');font-weight:100 800;font-style:normal;font-display:block}}
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{background:{t['bg']};color:{t['ink']};font-family:'Space Grotesk',sans-serif;
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}}
body{{width:{width}px;min-height:100vh;overflow-x:hidden}}
.inner{{padding:0 {gutter}px;width:{width}px}}
header.nav{{height:56px;border-bottom:1px solid {t['linie']};display:flex;align-items:center}}
header.nav .inner{{display:flex;align-items:center;justify-content:space-between;width:{width}px}}
.wordmark{{font-weight:600;font-size:16px;letter-spacing:-0.02em}}
nav.links{{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:{t['muted']};display:flex;gap:16px}}
nav.links em{{font-style:normal;color:{t['ink']};font-weight:500;border-bottom:2px solid {t['rust']};padding-bottom:2px}}
.kicker-row{{display:flex;align-items:center;gap:12px;margin:24px 0 8px;flex-wrap:wrap}}
.kicker{{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:{t['muted']}}}
.chip{{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;
  border:1px solid {t['ink']};border-radius:4px;padding:2px 8px;line-height:20px;color:{t['ink']};background:transparent}}
.scale{{font-family:'JetBrains Mono',monospace;font-size:12px;color:{t['muted']};margin:0 0 12px}}
.display{{font-size:{disp}px;font-weight:500;letter-spacing:-0.03em;line-height:0.95;font-variant-numeric:tabular-nums;
  font-family:'Space Grotesk',sans-serif;margin:8px 0 4px}}
h1{{font-size:{h1}px;font-weight:600;line-height:1.15;letter-spacing:-0.03em;text-wrap:balance;max-width:18ch;margin:0 0 12px}}
h2{{font-size:{h2}px;font-weight:600;line-height:1.2;letter-spacing:-0.02em;text-wrap:balance;max-width:22ch;margin:0 0 8px}}
.lead{{font-size:{lead}px;line-height:1.55;font-weight:400;max-width:52ch;margin:0 0 20px;color:{t['ink']}}}
.lead-muted{{color:{t['muted']}}}
.insight{{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:8px 0 16px;padding:12px 0;
  border-top:1px solid {t['linie']};border-bottom:1px solid {t['linie']}}}
@media (max-width:500px){{
  .insight{{grid-template-columns:1fr 1fr;}}
  .insight .cell:nth-child(3){{grid-column:1 / -1}}
}}
.insight .num{{font-family:'JetBrains Mono',monospace;font-size:{insight}px;font-weight:500;font-variant-numeric:tabular-nums;line-height:1.1;letter-spacing:-0.02em}}
.insight .lbl{{font-family:'JetBrains Mono',monospace;font-size:12px;color:{t['muted']};margin-top:4px;line-height:1.4;max-width:18ch}}
.fig{{font-family:'JetBrains Mono',monospace;font-size:12px;color:{t['muted']};line-height:1.5;margin:8px 0 12px;max-width:68ch}}
.values{{width:100%;border-collapse:collapse;font-family:'JetBrains Mono',monospace;font-size:12px;font-variant-numeric:tabular-nums;margin:0 0 8px}}
.values th,.values td{{text-align:left;padding:8px 10px 8px 0;border-bottom:1px solid {t['linie']};font-weight:400;line-height:1.4}}
.values th{{color:{t['muted']};font-weight:400}}
.values tr.is-on td{{font-weight:500}}
.values td:first-child{{color:{t['ink']}}}
.section{{margin:56px 0 0}}
.section:first-of-type{{margin-top:32px}}
footer.page{{margin:64px 0 0;padding:24px 0 48px;border-top:1px solid {t['linie']};
  font-family:'JetBrains Mono',monospace;font-size:12px;color:{t['muted']};line-height:1.5}}
/* slider */
.slider{{margin:8px 0 20px}}
.slider-names{{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:4px}}
.slider-names button{{min-height:44px;min-width:44px;padding:8px 10px;border:1px solid {t['linie']};background:{t['flaeche']};
  color:{t['ink']};font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:500;cursor:default;border-radius:4px;text-align:center}}
.slider-names button.is-on{{border-color:{t['ink']};box-shadow:inset 0 0 0 1px {t['ink']}}}
.slider-track-wrap{{position:relative;height:44px;display:flex;align-items:center}}
.slider-track-wrap input[type=range]{{-webkit-appearance:none;appearance:none;width:100%;height:44px;background:transparent;margin:0;cursor:default}}
.slider-track-wrap input[type=range]::-webkit-slider-runnable-track{{height:2px;background:{t['ink']}}}
.slider-track-wrap input[type=range]::-webkit-slider-thumb{{-webkit-appearance:none;appearance:none;width:44px;height:44px;border-radius:22px;
  background:{t['ink']};border:2px solid {t['bg']};box-shadow:0 0 0 1px {t['ink']};margin-top:-21px}}
.slider-ticks{{position:absolute;left:22px;right:22px;top:0;bottom:0;pointer-events:none}}
.slider-ticks i{{position:absolute;top:50%;width:2px;height:8px;margin-top:-4px;background:{t['muted']};display:block}}
.slider-ticks i.named{{height:12px;margin-top:-6px;background:{t['ink']}}}
.slider-hint{{font-family:'JetBrains Mono',monospace;font-size:12px;color:{t['muted']};margin-top:4px}}
/* legal */
.legal{{border:1px solid {t['linie']};padding:20px 24px;background:{t['flaeche']};margin-top:12px}}
.legal h3{{font-size:18px;font-weight:600;letter-spacing:-0.02em;margin:0 0 12px;max-width:32ch}}
.legal dl{{display:grid;gap:12px}}
.legal dt{{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:{t['ink']};margin-bottom:2px}}
.legal dd{{font-size:16px;line-height:1.55;color:{t['ink']}}}
.legal .entwurf{{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.08em;
  border:1px solid {t['ink']};border-radius:4px;padding:0 6px;margin-left:6px;vertical-align:middle}}
.legal .foot{{font-family:'JetBrains Mono',monospace;font-size:12px;color:{t['muted']};margin-top:16px;line-height:1.5}}
/* day cards */
.day-links{{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}}
.day-links a{{display:flex;align-items:center;min-height:44px;padding:10px 12px;border:1px solid {t['linie']};
  color:{t['ink']};text-decoration:none;font-size:16px;background:{t['flaeche']}}}
.day-links a strong{{font-weight:600;margin-right:8px}}
.day-links a span{{font-family:'JetBrains Mono',monospace;font-size:12px;color:{t['muted']}}}
.legend{{display:flex;flex-wrap:wrap;gap:12px 16px;margin:8px 0 12px;font-family:'JetBrains Mono',monospace;font-size:12px;color:{t['ink']}}}
.legend b{{display:inline-block;width:10px;height:10px;margin-right:6px;vertical-align:-1px}}
svg{{display:block;overflow:visible}}
text{{font-family:'JetBrains Mono',monospace}}
.hero-wrap{{display:flex;gap:24px;align-items:stretch;margin-top:8px}}
.hero-wrap.stack{{flex-direction:column;gap:8px}}
.g4-wrap{{display:flex;gap:32px;align-items:flex-start}}
.g4-wrap.stack{{flex-direction:column;gap:24px}}
.g3-wrap{{display:grid;grid-template-columns:1fr 1fr;gap:32px}}
.g3-wrap.stack{{grid-template-columns:1fr;gap:32px}}
.mod-kicker{{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:{t['muted']};margin-bottom:6px}}
.fnav-cards{{display:flex;flex-direction:column;gap:12px}}
@media (min-width:1100px){{
  .fnav-cards{{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px}}
  .fnav-cards article{{padding:0 0 0 0;border-bottom:none;border-top:1px solid {t['linie']};padding-top:12px}}
}}
.fnav-cards article{{padding:12px 0;border-bottom:1px solid {t['linie']}}}
.fnav-cards article:last-child{{border-bottom:none}}
.fnav-cards .who{{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:{t['muted']};margin-bottom:4px}}
.fnav-cards .num{{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:500;font-variant-numeric:tabular-nums;margin-bottom:4px}}
.fnav-cards p{{font-size:16px;line-height:1.55;color:{t['ink']}}}
.values{{max-width:100%}}
.values th,.values td{{overflow-wrap:anywhere}}

@media (max-width:500px){{
  .kicker-row{{margin:12px 0 6px}}
  .display{{margin:4px 0 2px}}
  h1{{margin:0 0 8px}}
  .lead{{margin:0 0 12px}}
  .insight{{margin:4px 0 8px;padding:8px 0;gap:12px}}
  .slider{{margin:4px 0 10px}}
  .section{{margin:40px 0 0}}
  .hero-wrap.stack{{gap:4px}}
}}
"""


# --------------- SVG helpers ---------------

def vg(w, h, body, aria=""):
    return f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{esc(aria)}" overflow="visible">{body}</svg>'


def tx(x, y, s, fill, size=12, anchor="start", weight=400, dy=0, extra=""):
    dya = f' dy="{dy}"' if dy else ""
    return (
        f'<text x="{x:.2f}" y="{y:.2f}" fill="{fill}" font-size="{size}" '
        f'font-family="JetBrains Mono, monospace" font-weight="{weight}" '
        f'text-anchor="{anchor}" font-variant-numeric="tabular-nums"{dya} {extra}>{esc(s)}</text>'
    )


def line(x1, y1, x2, y2, stroke, w=1, dash=None, cap="butt"):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{stroke}" stroke-width="{w}" fill="none" stroke-linecap="{cap}"{d}/>'


def poly(pts, stroke, w=2, dash=None, fill="none"):
    p = " ".join(f"{x:.2f},{y:.2f}" for x, y in pts)
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<polyline points="{p}" fill="{fill}" stroke="{stroke}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"{d}/>'


def circ(x, y, r, fill, stroke=None, sw=1):
    s = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ' stroke="none"'
    return f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r}" fill="{fill}"{s}/>'


def rect(x, y, w, h, fill, stroke=None, sw=1, op=1, rx=0):
    s = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ' stroke="none"'
    o = f' opacity="{op}"' if op != 1 else ""
    r = f' rx="{rx}"' if rx else ""
    return f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" fill="{fill}"{s}{o}{r}/>'


def knockout(x, y, w, h, bg, op=0.88):
    return rect(x, y, w, h, bg, op=op)


def mapx(v, a, b, L, W):
    return L + (v - a) / (b - a) * W


def mapy(v, a, b, T, H):
    return T + (b - v) / (b - a) * H


def hatches(tid, color, bg):
    return (
        f'<defs>'
        f'<pattern id="hatch-{tid}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
        f'<rect width="7" height="7" fill="{bg}"/>'
        f'<line x1="0" y1="0" x2="0" y2="7" stroke="{color}" stroke-width="1.25"/>'
        f'</pattern>'
        f'<pattern id="hatch-soc-{tid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
        f'<line x1="0" y1="0" x2="0" y2="6" stroke="{color}" stroke-width="0.9" opacity="0.55"/>'
        f'</pattern>'
        f'</defs>'
    )


# --------------- G1 Hero ---------------

# ViewBoxes. Wide only for artboard 1280 (container ≥ 1100). 768 uses 390-viewBox, scaled by the page (we render 390 layout at 390 and document 768 in SPEC).
# 390 full-axis: 350×120, L38 R16 T14 B36 → plot 296×70
# 390 zoom:      350×300, L48 R18 T24 B54 → plot 284×222
# 1280 combined: 1152×360
#   thumb: x=0,    260×360, L40 R12 T28 B50 → plot 208×282
#   zoom:  x=284,  868×360, L52 R28 T28 B54 → plot 788×278

def _front_xy(mode, L, T, W, H):
    if mode == "zoom":
        xa, xb = ZOOM_X
    else:
        xa, xb = FULL_X
    ya, yb = Y_RNG
    pts = []
    for p in FRONT:
        pts.append((mapx(p["rev"], xa, xb, L, W), mapy(p["red"], ya, yb, T, H), p))
    return pts


def g1_full_axis(theme, width, state="kompromiss"):
    t = THEME[theme]
    ink, muted, grid, bg, rust = t["ink"], t["muted"], t["grid"], t["bg"], t["rust"]
    if width >= 1100:
        VW, VH, L, R, Tp, B = 260, 360, 40, 14, 32, 52
    else:
        VW, VH, L, R, Tp, B = 350, 120, 38, 16, 16, 36
    plotW, plotH = VW - L - R, VH - Tp - B
    xa, xb = FULL_X
    ya, yb = Y_RNG
    parts = [hatches(f"f{width}{theme}", rust, bg)]
    # plot frame
    parts.append(rect(L, Tp, plotW, plotH, t["flaeche"]))
    # 70/70 field: x from 0.70*34.09=23.86 to xb, y from 2.51 to yb
    fx = mapx(0.70 * MARKT_REV, xa, xb, L, plotW)
    fy = mapy(D.EPS70["red"], ya, yb, Tp, plotH)
    fww = mapx(xb, xa, xb, L, plotW) - fx
    fhh = fy - Tp  # y decreases upward; top is yb=4.2, fy is 2.51
    # field from fy (2.51 line) up to Tp (4.2)
    parts.append(rect(fx, Tp, fww, fy - Tp, t["field"]))
    # grid
    if width >= 1100:
        xticks = [0, 10, 20, 30, 34]
        yticks = [0, 1, 2, 3, 4]
    else:
        xticks = [0, 20, 34]
        yticks = [0, 4]
    for xv in xticks:
        x = mapx(xv, xa, xb, L, plotW)
        parts.append(line(x, Tp, x, Tp + plotH, grid, 1))
        parts.append(tx(x, Tp + plotH + 16, D.dec(xv, 0), muted, 12, "middle"))
    for yv in yticks:
        y = mapy(yv, ya, yb, Tp, plotH)
        parts.append(line(L, y, L + plotW, y, grid, 1))
        parts.append(tx(L - 6, y + 4, D.dec(yv, 0), muted, 12, "end"))
    parts.append(line(L, Tp + plotH, L + plotW, Tp + plotH, ink, 1.25))
    parts.append(line(L, Tp, L, Tp + plotH, ink, 1.25))
    # 70% reduction line on full axis
    parts.append(line(L, fy, L + plotW, fy, muted, 1, dash="4 3"))
    # front (almost a sliver)
    fpts = _front_xy("full", L, Tp, plotW, plotH)
    parts.append(poly([(x, y) for x, y, _ in fpts], ink, 2.5))
    for x, y, p in fpts:
        if p["name"] in ("markt", "netz", "kompromiss"):
            fill = rust if p["name"] == "markt" else ink
            parts.append(circ(x, y, 3.2, fill, bg, 1))
    # zoom window 33.70–34.18, 0–4.2 (full y of zoom)
    wx1 = mapx(ZOOM_X[0], xa, xb, L, plotW)
    wx2 = mapx(ZOOM_X[1], xa, xb, L, plotW)
    # exact thin window; min visual 6 px already ~ (0.48/36)*208≈2.8, use exact + rust stroke
    # pad visually with a slightly taller stroke and a label
    parts.append(rect(wx1 - 1, Tp, max(wx2 - wx1, 4) + 2, plotH, t["rust_tint2"], rust, 1.5))
    # labels
    if width >= 1100:
        parts.append(tx(L, 16, "Volle Achse", ink, 12, "start", 500))
        parts.append(tx(wx1 - 6, Tp - 6, "Zoom", ink, 12, "end", 500))
    else:
        parts.append(tx(L, 12, "Volle Achse", ink, 12, "start", 500))
        parts.append(tx(L + plotW, 12, "0,30" + D.NBSP + "von 34,09  ·  Zoom", ink, 12, "end", 500))
    # cost bracket
    # "0,30 von 34,09" under or beside the window
    mid = (wx1 + max(wx2, wx1 + 4)) / 2
    if width >= 1100:
        parts.append(tx(mid, Tp + plotH + 34, "0,30", ink, 12, "middle", 500))
    return vg(VW, VH, "".join(parts), "Volle Pareto-Achse, 0 bis 34 Millionen Euro, Zoomfenster oben rechts"), (VW, VH, L, Tp, plotW, plotH, wx1, wx2)


MARKT_REV = D.MARKT["rev"]


def g1_zoom(theme, width, state="kompromiss"):
    t = THEME[theme]
    ink, muted, grid, bg, rust, fl = t["ink"], t["muted"], t["grid"], t["bg"], t["rust"], t["flaeche"]
    # In dark, never rust text
    rust_text = ink if theme == "dark" else rust
    if width >= 1100:
        VW, VH, L, R, Tp, B = 868, 360, 52, 36, 32, 54
    else:
        VW, VH, L, R, Tp, B = 350, 300, 48, 18, 26, 54
    plotW, plotH = VW - L - R, VH - Tp - B
    xa, xb = ZOOM_X
    ya, yb = Y_RNG
    sel = STATES[state]["idx"]
    parts = [hatches(f"z{width}{theme}{state}", rust, bg)]
    parts.append(rect(L, Tp, plotW, plotH, fl))
    # 70% reduction line + field above it (to top)
    fy = mapy(D.EPS70["red"], ya, yb, Tp, plotH)
    parts.append(rect(L, Tp, plotW, fy - Tp, t["field"]))
    # ticks
    if width >= 1100:
        xticks = [33.70, 33.80, 33.90, 34.00, 34.10]
        yticks = [1, 2, 3, 4]
    else:
        xticks = [33.7, 33.9, 34.1]
        yticks = [2, 4]
    for xv in xticks:
        x = mapx(xv, xa, xb, L, plotW)
        parts.append(line(x, Tp, x, Tp + plotH, grid, 1))
        lab = D.dec(xv, 1) if xv >= 33.7 else D.dec(xv, 2)
        parts.append(tx(x, Tp + plotH + 16, lab, muted, 12, "middle"))
    for yv in yticks:
        y = mapy(yv, ya, yb, Tp, plotH)
        parts.append(line(L, y, L + plotW, y, grid, 1))
        parts.append(tx(L - 8, y + 4, D.dec(yv, 0), muted, 12, "end"))
    # 2,51 as explicit y-tick (70 %)
    parts.append(line(L, fy, L + plotW, fy, muted, 1, dash="5 4"))
    parts.append(tx(L - 8, fy + 4, "2,51", ink, 12, "end", 500))
    parts.append(line(L, Tp + plotH, L + plotW, Tp + plotH, ink, 1.25))
    parts.append(line(L, Tp, L, Tp + plotH, ink, 1.25))
    # axis titles
    parts.append(tx((L + L + plotW) / 2, VH - 8, "Day-Ahead-Erlös, Mio." + D.NBSP + "€  ·  Modellschätzung", muted, 12, "middle"))
    if width >= 1100:
        parts.append(tx(L, 16, "Zoom 33,70–34,18  ·  Senkung in GW", ink, 12, "start", 500))
    else:
        parts.append(tx(L, 16, "Senkung, GW", ink, 12, "start", 500))
    # 70% label — left inside, above the line, knockout
    lbl70 = "70" + D.NBSP + "%" + D.NBSP + "der max. Senkung"
    if width >= 1100:
        parts.append(knockout(L + 8, fy - 22, 188, 16, fl, 0.92))
        parts.append(tx(L + 10, fy - 10, lbl70, ink, 12, "start"))
    else:
        # on mobile, put at left, above line, shorter if needed
        parts.append(knockout(L + 6, fy - 22, 156, 16, fl, 0.92))
        parts.append(tx(L + 8, fy - 10, "70" + D.NBSP + "% der max. Senkung", ink, 12, "start"))
    # front line THEN points THEN labels (hatch would be behind)
    fpts = _front_xy("zoom", L, Tp, plotW, plotH)
    parts.append(poly([(x, y) for x, y, _ in fpts], ink, 2.5))
    # intermediate points
    for x, y, p in fpts:
        if p["name"] not in ("markt", "netz", "kompromiss"):
            parts.append(circ(x, y, 3, fl, ink, 1.25))
    # named endpoints + selected
    named = {p["name"]: (x, y, p) for x, y, p in fpts if p["name"]}
    # Markt
    mx, my, _ = named["markt"]
    parts.append(circ(mx, my, 6, rust, bg, 1.5))
    # Netz
    nx, ny, _ = named["netz"]
    parts.append(circ(nx, ny, 6, ink, bg, 1.5))
    # Kompromiss
    kx, ky, _ = named["kompromiss"]
    parts.append(circ(kx, ky, 6, ink, bg, 1.5))
    # selected ring
    sx, sy, sp = fpts[sel]
    parts.append(circ(sx, sy, 11, "none", rust, 2.25))
    parts.append(circ(sx, sy, 6, rust if sp["name"] == "markt" else ink, bg, 1.5))

    # ---- Labels: explicit per width, end labels at the point ----
    # Collision rules applied by construction (see SPEC table).
    # 390:
    #   Netzdienlich: start, right of point, two lines (name, values). x=nx+10, y=ny-6 and ny+10
    #   Kompromiss:   start, right of point, two lines. x=kx+12, y=ky+6 and ky+20  (below, to clear 70% label)
    #   Max. Erlös:   end, left of point, two lines. x=mx-10, y=my-10 and my+4
    # 1280:
    #   similar, more room, values on same or second line
    def two_line(x, y1, name, val, anchor, fill=ink):
        # knockout approx
        wch = max(len(name), len(val)) * 7.3 + 8
        if anchor == "end":
            parts.append(knockout(x - wch, y1 - 12, wch + 4, 36, fl, 0.90))
        else:
            parts.append(knockout(x - 4, y1 - 12, wch + 4, 36, fl, 0.90))
        parts.append(tx(x, y1, name, fill, 12, anchor, 500))
        parts.append(tx(x, y1 + 18, val, fill, 12, anchor, 400))

    val_n = f"{D.dec(D.A['netz_rev'])}  ·  {D.gw(D.A['netz_red'])}"
    val_k = f"{D.dec(D.A['k_rev'])}  ·  {D.gw(D.A['k_red'])}"
    val_m = f"{D.dec(D.A['markt_rev'])}  ·  {D.gw(D.A['markt_red'])}"

    if width >= 1100:
        # Netzdienlich: right of last (left-top) point
        two_line(nx + 12, ny - 4, "Netzdienlich  ·  lex.", val_n, "start")
        # Kompromiss: right, slightly below so 70% label (left) is free
        two_line(kx + 12, ky + 16, "Kompromiss", val_k, "start")
        # Max. Erlös: left of point, above
        two_line(mx - 12, my - 8, "Max. Erlös  ·  lex.", val_m, "end")
        # cost arrow at top between markt-x and netz-x
        xL, xR = nx, mx
        yA = Tp + 14
        parts.append(line(xL, yA, xR, yA, ink, 1))
        parts.append(line(xL, yA - 4, xL, yA + 4, ink, 1))
        parts.append(line(xR, yA - 4, xR, yA + 4, ink, 1))
        parts.append(knockout((xL + xR) / 2 - 110, yA - 16, 220, 16, fl, 0.92))
        parts.append(tx((xL + xR) / 2, yA - 5, "volle Senkung kostet 0,30" + D.NBSP + "Mio." + D.NBSP + "€  (0,89" + D.NBSP + "%)", ink, 12, "middle", 500))
    else:
        # 390 — tighter, two lines, guaranteed inside viewBox (350)
        # Netzdienlich at top: if nx+12 + ~110 would clip? nx is ~ plot left + small.
        two_line(nx + 10, ny - 20, "Netzdienlich", val_n, "start")
        # Kompromiss: end-anchor LEFT of the point (start-anchor would exit the 350-viewBox)
        two_line(kx - 10, ky + 22, "Kompromiss", val_k, "end")
        two_line(mx - 10, my - 6, "Max. Erlös", val_m, "end")
        # cost lives on the full-axis thumbnail, not here (would collide with Netzdienlich)

    return vg(VW, VH, "".join(parts), "Zoom der Pareto-Front zwischen 33,70 und 34,18 Millionen Euro")


def slider_html(theme, width, state="kompromiss"):
    t = THEME[theme]
    n = len(FRONT) - 1
    val = STATES[state]["idx"]
    p = FRONT[val]
    # aria-valuetext
    names = {0: "Maximaler Erlös", IDX["kompromiss"]: "Kompromiss", IDX["netz"]: "Netzdienlich"}
    nm = names.get(val, "Frontpunkt")
    vt = (
        f"{nm}: {D.dec(p['rev'])} Millionen Euro Modellschätzung, "
        f"Senkung {D.dec(p['red'])} Gigawatt"
    )
    ticks = []
    for i, pt in enumerate(FRONT):
        pct = i / n * 100
        cls = " named" if pt["name"] in ("markt", "kompromiss", "netz") else ""
        ticks.append(f'<i class="{cls}" style="left:{pct:.3f}%"></i>')
    # named buttons
    def btn(key, label):
        on = " is-on" if state == key else ""
        return f'<button type="button" class="{on}" tabindex="0">{label}</button>'
    return f"""
<div class="slider" role="group" aria-label="Fahrweise auf der Pareto-Front">
  <div class="slider-names">
    {btn("erloes", "Max. Erlös")}
    {btn("kompromiss", "Kompromiss")}
    {btn("netz", "Netzdienlich")}
  </div>
  <div class="slider-track-wrap">
    <div class="slider-ticks">{''.join(ticks)}</div>
    <input type="range" min="0" max="{n}" step="1" value="{val}"
      aria-label="Fahrweise" aria-valuemin="0" aria-valuemax="{n}" aria-valuenow="{val}"
      aria-valuetext="{esc(vt)}" />
  </div>
  <p class="slider-hint">Rastet auf {len(FRONT)} vorgerechneten Front-Punkten  ·  Pfeiltasten  ·  kein Live-LP</p>
</div>
"""


def insight_html(state="kompromiss"):
    p = FRONT[STATES[state]["idx"]]
    if state == "kompromiss":
        cells = [
            (D.gw(D.A["k_red"]), "Senkung der Monatsspitze"),
            (D.mio(D.A["k_rev"]), "Erlös, Modellschätzung"),
            (D.pct(D.A["k_frac"]), "des Markt-Erlöses"),
        ]
    elif state == "erloes":
        cells = [
            (D.gw(D.A["markt_red"]), "Senkung der Monatsspitze"),
            (D.mio(D.A["markt_rev"]), "Erlös, Modellschätzung"),
            ("100" + D.NBSP + "%", "des Markt-Erlöses"),
        ]
    else:
        cells = [
            (D.gw(D.A["netz_red"]), "Senkung der Monatsspitze"),
            (D.mio(D.A["netz_rev"]), "Erlös, Modellschätzung"),
            (D.pct(99.11, 2) if False else "99,1" + D.NBSP + "%", "des Markt-Erlöses"),
        ]
    inner = "".join(
        f'<div class="cell"><div class="num">{a}</div><div class="lbl">{b}</div></div>' for a, b in cells
    )
    return f'<div class="insight">{inner}</div>'


def values_table(state="kompromiss"):
    rows = [
        ("erloes", "Max. Erlös", D.A["markt_rev"], D.A["markt_red"], D.A["markt_peak"], None),
        ("kompromiss", "Kompromiss", D.A["k_rev"], D.A["k_red"], D.A["k_peak"], "99,64" + D.NBSP + "%"),
        ("netz", "Netzdienlich", D.A["netz_rev"], D.A["netz_red"], D.A["netz_peak"], None),
    ]
    tr = []
    for key, name, rev, red, peak, frac in rows:
        on = ' class="is-on"' if key == state else ""
        fr = f" ({frac})" if frac else ""
        tr.append(
            f"<tr{on}><td>{name}</td><td>{D.mio(rev)}{fr}</td><td>{D.gw(red)}</td><td>{D.gw(peak)}</td></tr>"
        )
    return (
        '<table class="values">'
        f"<thead><tr><th>Fahrweise</th><th>Erlös (Modellschätzung)</th><th>Senkung</th><th>Spitze</th></tr></thead>"
        f"<tbody>{''.join(tr)}</tbody></table>"
        '<p class="fig">Endpunkte lexikographisch: erst das Ziel, dann das andere. Ohne das zweite Ziel wäre der Netz-„Erlös“ −3,08 Mio. € — ein Löser-Artefakt, nicht der Preis der Netzdienlichkeit.</p>'
    )


# --------------- G2 Tagesstreifen ---------------

KLASSE_LABEL = {
    "win_win": "Win-win",
    "neutral": "Neutral",
    "konflikt_schwach": "Konflikt-schwach",
    "konflikt_hebung": "Konflikt-Hebung",
}


def g2_strip(theme, width):
    t = THEME[theme]
    ink, muted, bg, fl = t["ink"], t["muted"], t["bg"], t["flaeche"]
    fills = {
        "win_win": t["win"],
        "neutral": t["neutral_fill"],
        "konflikt_schwach": t["schwach_fill"] if theme == "light" else t["schwach"],
        "konflikt_hebung": t["hebung"],
    }
    if width >= 1100:
        VW, VH, L, R, Tp, B = 1152, 200, 16, 16, 48, 36
    else:
        VW, VH, L, R, Tp, B = 350, 250, 16, 16, 56, 28
    plotW = VW - L - R
    n = 31
    gap = 3 if width >= 1100 else 2
    bw = (plotW - (n - 1) * gap) / n
    # bar height area
    barT, barH = Tp, (80 if width >= 1100 else 70)
    parts = []
    # 70% and 30% lines — height encodes share, 70% is a reference
    # share can be negative (hebung). Scale: -0.6 to 0.7
    y0_share, y1_share = -0.60, 0.75
    def sy(share):
        return barT + (y1_share - share) / (y1_share - y0_share) * barH

    zero_y = sy(0)
    p70 = sy(0.70)
    p30 = sy(0.30)
    parts.append(line(L, p70, L + plotW, p70, t["win"], 1, dash="4 3"))
    parts.append(line(L, p30, L + plotW, p30, t["schwach"], 1, dash="3 3"))
    parts.append(line(L, zero_y, L + plotW, zero_y, ink, 1))
    # 70/30 inside the viewBox, RIGHT end, end-anchor (left would collide with 06.10)
    parts.append(tx(L + plotW, p70 - 4, "70" + D.NBSP + "%", ink, 12, "end", 500))
    parts.append(tx(L + plotW, p30 - 4, "30" + D.NBSP + "%", muted, 12, "end"))

    # Need more right margin for 1280 if we wanted right labels — we use left instead, and increase L.
    # Bars
    annotations = []
    for i, d in enumerate(DAYS):
        x = L + i * (bw + gap)
        y_top = sy(max(d["share"], 0))
        y_bot = sy(min(d["share"], 0))
        h = abs(y_bot - y_top)
        if h < 2 and d["klasse"] != "konflikt_hebung":
            h = 2
            y_top = zero_y - 2 if d["share"] >= 0 else zero_y
        fill = fills[d["klasse"]]
        if d["share"] >= 0:
            parts.append(rect(x, y_top, bw, zero_y - y_top if zero_y - y_top > 1 else 2, fill))
        else:
            # hebung: bar downward
            parts.append(rect(x, zero_y, bw, y_bot - zero_y, fill))
        # day numbers every 5 plus 21, 25, 29, 6, 3
        day = d["day"]
        show = day in (1, 6, 10, 15, 21, 25, 31) or (width >= 1100 and day % 2 == 1)
        if show:
            anc = "start" if day == 1 else ("end" if day == 31 else "middle")
            xx = x if day == 1 else (x + bw if day == 31 else x + bw / 2)
            parts.append(tx(xx, zero_y + 16, f"{day:02d}.", muted, 12, anc))
        # special labels
        if day == 6:
            annotations.append((x + bw / 2, y_top - 4, "06.10.  46" + D.NBSP + "%", "middle"))
        if day == 3 and width >= 1100:
            annotations.append((x + bw / 2, y_top - 4, "41" + D.NBSP + "%", "middle"))
        if day == 21:
            annotations.append((x + bw / 2, y_bot + 28 if d["share"] < 0 else y_top - 4, "21.10. hebt 1,31" + D.NBSP + "GW", "middle"))
        if day == 29:
            annotations.append((x + bw / 2, y_top - 4, "29.10.  10" + D.NBSP + "%  ·  Monatsspitze", "middle"))

    # Place annotations carefully — 390: 21.10 and 29.10 must not collide, 06.10 at top
    # On 390 the strip is 350 wide, 21 is at x≈20/31*350≈237, 29 at 325. "hebt" and "Monatsspitze" may need to be two lines and end-anchored for 29.
    for x, y, lab, anc in annotations:
        # clamp into viewBox
        if "21.10" in lab and width < 1100:
            parts.append(knockout(x - 80, zero_y + 22, 160, 16, bg, 0.9))
            parts.append(tx(x, zero_y + 34, "21.10. hebt 1,31" + D.NBSP + "GW", ink, 12, "middle", 500))
        elif "29.10" in lab and width < 1100:
            parts.append(knockout(VW - R - 164, 4, 164, 16, bg, 0.9))
            parts.append(tx(VW - R, 16, "29.10.  10" + D.NBSP + "%", ink, 12, "end", 500))
        elif "06.10" in lab:
            parts.append(knockout(x - 70, y - 28, 140, 16, bg, 0.9))
            parts.append(tx(x, y - 16, lab, ink, 12, "middle", 500))
        elif width >= 1100:
            # 1280: 21.10 is hebung (below), 29.10 above, 06.10 above
            if "hebt" in lab:
                parts.append(tx(x, zero_y + 34, lab, ink, 12, "middle", 500))
            elif "29.10" in lab:
                # may be long — place above, slightly left if near edge
                parts.append(tx(min(x, VW - 8), y - 16, lab, ink, 12, "end" if x > VW - 200 else "middle", 500))
            else:
                parts.append(tx(x, y - 16, lab, ink, 12, "middle", 500))

    return vg(VW, VH, "".join(parts), "31 Oktobertage nach Regel T: 0 Win-win, 18 neutral, 11 Konflikt-schwach, 2 Konflikt-Hebung")


def legend_g2(theme):
    t = THEME[theme]
    items = [
        (t["win"], "Win-win  (0)"),
        (t["neutral_fill"], "Neutral  (18)"),
        (t["schwach_fill"] if theme == "light" else t["schwach"], "Konflikt-schwach  (11)"),
        (t["hebung"], "Konflikt-Hebung  (2)"),
    ]
    return '<div class="legend">' + "".join(
        f'<span><b style="background:{c}"></b>{lab}</span>' for c, lab in items
    ) + "</div>"


# --------------- G3 Beispieltage ---------------

def _day_series(date):
    return dict(
        beobachtet=D.load_day(date, "price"),  # residual identical
        markt=D.load_day(date, "price"),
        netz=D.load_day(date, "peak"),
        komp=D.load_day(date, "eps70"),
    )


SERIES_21 = None
SERIES_29 = None


def _ensure_series():
    global SERIES_21, SERIES_29
    if SERIES_21 is None:
        SERIES_21 = _day_series("2026-10-21")
        SERIES_29 = _day_series("2026-10-29")


def g3_day(theme, width, date, series, info, title, subtitle):
    t = THEME[theme]
    ink, muted, grid, bg, rust, fl = t["ink"], t["muted"], t["grid"], t["bg"], t["rust"], t["flaeche"]
    rust_text = ink if theme == "dark" else rust
    # Two stacked plots: residual (top) + price (bottom), SoC band 23-24
    if width >= 1100:
        VW, L, R = 560, 44, 16
        topH, priceH, midH = 240, 70, 8
        Tp, B = 36, 28
    else:
        VW, L, R = 350, 40, 12
        topH, priceH, midH = 220, 70, 8
        Tp, B = 40, 28
    VH = Tp + topH + midH + priceH + B
    plotW = VW - L - R
    residual_T = Tp
    price_T = Tp + topH + midH
    # Shared residual y: 20–70 GW (same both days — 21.10 stays under Monatsspitze)
    ya, yb = 20.0, 70.0
    n = len(series["beobachtet"]["residual"])
    def x_at(i):
        return L + (i / (n - 1)) * plotW
    def x_hour(h):
        return L + (h / 24.0) * plotW
    def yR(gw):
        return residual_T + (yb - gw) / (yb - ya) * topH

    parts = [hatches(f"d{date}{width}{theme}", rust, muted)]
    parts.append(rect(L, residual_T, plotW, topH, fl))
    parts.append(rect(L, price_T, plotW, priceH, fl))
    # SoC band 23-24 on both plots
    x23, x24 = x_hour(23), x_hour(24)
    parts.append(rect(x23, residual_T, x24 - x23, topH, f"url(#hatch-soc-d{date}{width}{theme})", op=1))
    parts.append(rect(x23, price_T, x24 - x23, priceH, f"url(#hatch-soc-d{date}{width}{theme})"))
    # grid residual
    for gv in (20, 30, 40, 50, 60, 70):
        if width < 1100 and gv in (30, 50):
            continue
        y = yR(gv)
        parts.append(line(L, y, L + plotW, y, grid, 1))
        parts.append(tx(L - 6, y + 4, D.dec(gv, 0), muted, 12, "end"))
    # month peak 64,41 reference
    y64 = yR(64.41)
    parts.append(line(L, y64, L + plotW, y64, muted, 1, dash="4 3"))
    if date.endswith("21"):
        parts.append(tx(L + 6, y64 - 6, "Monatsspitze 64,41", muted, 12, "start"))
    elif width >= 1100:
        parts.append(tx(L + 6, y64 - 6, "Monatsspitze 64,41", muted, 12, "start"))
    else:
        parts.append(tx(L + 6, y64 - 6, "64,41", muted, 12, "start"))

    # charge/discharge area of MARKET (the story), rust / ink tints
    m = series["markt"]
    obs = series["beobachtet"]["residual"]
    area_up, area_dn = [], []
    for i in range(n):
        x = x_at(i)
        r = obs[i]
        rp = m["prime"][i]
        if rp >= r:
            area_up.append((x, yR(r), yR(rp)))
        else:
            area_dn.append((x, yR(rp), yR(r)))
    # draw as thin rects per interval (step)
    dx = plotW / (n - 1)
    for i in range(n - 1):
        r0, r1 = obs[i], obs[i + 1]
        p0, p1 = m["prime"][i], m["prime"][i + 1]
        x = x_at(i)
        # charge: prime > residual (adds load)
        if p0 > r0 + 0.02:
            y1, y2 = yR(p0), yR(r0)
            parts.append(rect(x, y1, dx + 0.3, y2 - y1, t["rust_tint2"]))
        elif r0 > p0 + 0.02:
            y1, y2 = yR(r0), yR(p0)
            parts.append(rect(x, y1, dx + 0.3, y2 - y1, "rgba(16,18,20,0.10)" if theme == "light" else "rgba(233,238,242,0.12)"))

    def pl(vals, stroke, w, dash=None):
        pts = [(x_at(i), yR(vals[i])) for i in range(n)]
        parts.append(poly(pts, stroke, w, dash))

    pl(obs, muted, 1.5)
    pl(series["netz"]["prime"], ink, 2.0)
    pl(series["komp"]["prime"], ink, 1.75, dash="6 4")
    pl(m["prime"], rust, 2.25)

    parts.append(line(L, residual_T + topH, L + plotW, residual_T + topH, ink, 1.25))
    parts.append(line(L, residual_T, L, residual_T + topH, ink, 1.25))

    # residual: tick marks only, hours live on the price track (one axis, no collision in the gap)
    for h in (0, 6, 12, 18, 24):
        x = x_hour(h)
        parts.append(line(x, residual_T + topH, x, residual_T + topH + 4, ink, 1))

    # title
    parts.append(tx(L, 16, title, ink, 12, "start", 500))
    if width >= 1100:
        parts.append(tx(L + plotW, 16, subtitle, muted, 12, "end"))

    # ---- event labels, explicit, inside viewBox ----
    if date.endswith("21"):
        x14 = x_hour(14)
        y556 = yR(55.60)
        lab = "neue Spitze 55,60" + D.NBSP + "GW"
        lab2 = "lädt 4,64" + D.NBSP + "GW  ·  14:00"
        tw = 168
        parts.append(knockout(x14 - 8 - tw, y556 - 40, tw + 4, 38, fl, 0.90))
        parts.append(tx(x14 - 8, y556 - 24, lab, ink, 12, "end", 500))
        parts.append(tx(x14 - 8, y556 - 6, lab2, ink, 12, "end"))  # 18 px leading
        # beobachtet 18:30 — BELOW its line, end-anchor, left of evening
        x1830 = x_hour(18.5)
        y543 = yR(54.30)
        parts.append(tx(x1830 - 4, y543 + 16, "beobachtet 54,30  ·  18:30", muted, 12, "end"))
        # Netzdienlich 51,68: further RIGHT and LOWER, 18+ px below beobachtet
        y516 = yR(51.68)
        if width >= 1100:
            parts.append(tx(x23 - 8, y516 + 28, "Netzdienlich 51,68", ink, 12, "end"))
        else:
            parts.append(tx(L + plotW - 2, y516 + 22, "Netzdienlich 51,68", ink, 12, "end"))
    else:
        x1815 = x_hour(18.25)
        y644 = yR(64.41)
        y608 = yR(60.82)
        # Markt leftover BELOW 64,41, end-anchor at 18:15 — short, stops before SoC band
        # Markt a bit LOWER and more LEFT, so it stays clear of SoC (top-right) and of Netzdienlich
        parts.append(tx(x_hour(18.25) - 6, y644 + 28, "Markt: 0,83" + D.NBSP + "GW übrig", ink, 12, "end", 500))
        # Netzdienlich mid-morning, ABOVE its plateau, short
        if width >= 1100:
            parts.append(tx(x_hour(8), y608 - 10, "Netzdienlich 60,82  ·  16:45–19:00", ink, 12, "start", 500))
        else:
            parts.append(tx(x_hour(8), y608 - 10, "Netzdienlich 60,82", ink, 12, "start", 500))

    # SoC label — inside the band, vertical or short at top of band
    # SoC-Hinweis in der Preisspur (oben in Residual würden 60–64 GW-Labels treffen)
    parts.append(tx(x23 - 6, price_T + priceH - 6, "SoC-Rückkehr  ·  Modellartefakt", muted, 12, "end"))

    # Price track
    prices = series["markt"]["price"]
    pmax = 600.0 if date.endswith("29") else 320.0
    pmin = 0.0
    def yP(pv):
        return price_T + (pmax - pv) / (pmax - pmin) * priceH
    for gv in ((0, 300) if date.endswith("29") else (0, 200)):
        y = yP(gv)
        parts.append(line(L, y, L + plotW, y, grid, 1))
        parts.append(tx(L - 6, y + 4, D.dec(gv, 0), muted, 12, "end"))
    ppts = [(x_at(i), yP(prices[i])) for i in range(n)]
    parts.append(poly(ppts, ink, 1.5))
    parts.append(line(L, price_T + priceH, L + plotW, price_T + priceH, ink, 1.25))
    parts.append(line(L, price_T, L, price_T + priceH, ink, 1.25))
    parts.append(tx(L, price_T - 2, "€/MWh", muted, 12, "start"))
    for h in (0, 6, 12, 18, 24):
        anc = "start" if h == 0 else ("end" if h == 24 else "middle")
        parts.append(tx(x_hour(h), price_T + priceH + 18, f"{h:02d}", muted, 12, anc))
    if date.endswith("29"):
        xp, yp = x_hour(17.25), yP(574.28)
        parts.append(circ(xp, yp, 3.5, ink, bg, 1))
        # inside the price plot, above the peak, end-anchor (left), not as a y-tick
        parts.append(tx(xp - 8, yp + 18, "574" + D.NBSP + "€/MWh  ·  17:15", ink, 12, "end", 500) if width >= 1100
                     else tx(xp - 8, yp + 18, "574" + D.NBSP + "€  ·  17:15", ink, 12, "end", 500))
    else:
        xp, yp = x_hour(14), yP(201.29)
        parts.append(circ(xp, yp, 3.5, ink, bg, 1))
        parts.append(tx(xp - 8, yp + 16, "201" + D.NBSP + "€  ·  14:00", ink, 12, "end", 500))

    # line legend (compact, top right or under title)
    if width >= 1100:
        lx = L
        ly = residual_T + topH + 0  # hours already there
        # put in title row: three line samples — skip, use HTML legend under

    return vg(VW, VH, "".join(parts), f"Restlast und Fahrpläne am {title}")


def g3_legend_html(theme):
    t = THEME[theme]
    ink, muted, rust = t["ink"], t["muted"], t["rust"]
    rust_l = ink if theme == "dark" else rust
    return (
        '<div class="legend">'
        f'<span><b style="background:{muted};height:2px;width:16px;vertical-align:middle"></b>beobachtet</span>'
        f'<span><b style="background:{rust};height:2px;width:16px;vertical-align:middle"></b>Max. Erlös</span>'
        f'<span><b style="background:{ink};height:2px;width:16px;vertical-align:middle"></b>Netzdienlich</span>'
        f'<span><b style="background:{ink};height:2px;width:16px;vertical-align:middle;outline:1px dashed {ink};outline-offset:1px"></b>Kompromiss</span>'
        f'<span><b style="background:{t["rust_tint2"]}"></b>Markt lädt</span>'
        "</div>"
    )


# --------------- G4 fNAV + Kipppunkt ---------------

def g4_fnav_panel(theme, width):
    """Vergleich Zeitfenster vs. Deckel. Euro nur ×2, Modellschätzung. Kein 4-Spalten-Raster auf 390."""
    t = THEME[theme]
    cards = [
        ("Zeitfenster 16–21 Uhr",
         D.mio(D.A["fnav_f_rev"]) + "  ·  " + D.gw(D.A["fnav_f_red"]),
         "Identisch mit Max. Erlös — wirkt nicht. Das Fenster verhindert das Mittagsladen am 21.10. nicht und erzwingt kein Entladen in die Abendspitze."),
        ("Leistungsdeckel 62" + D.NBSP + "GW",
         D.mio(D.A["deckel_rev"]) + "  ·  " + D.gw(D.A["deckel_red"]) + "  ·  99,7" + D.NBSP + "%",
         "Das ist der ε-Schnitt, den der Schieber schon erzeugt. Was sich in einen Vertrag schreiben lässt und wirkt."),
        ("Deckel 64,41" + D.NBSP + "GW  ·  „keine neue Spitze“",
         "ändert ×2 nicht  ·  0,37" + D.NBSP + "GW bleibt",
         "Begrenzt ×5/×10 auf die beobachteten 64,41" + D.NBSP + "GW, ohne selbst zu senken."),
    ]
    arts = "".join(
        f'<article><div class="who">{a}</div><div class="num">{b}</div><p>{c}</p></article>'
        for a, b, c in cards
    )
    foot = (
        '<p class="fig">fNAV nach § 17 Abs. 2b EnWG, national, kein örtlicher Anschlussvertrag. '
        'Stilisiert als Leistungsdeckel auf die Restlast nach Speicher. Das Zeitfenster nur als Vergleich.</p>'
    )
    return f'<div class="fnav-cards">{arts}</div>{foot}'


def g4_kipppunkt(theme, width):
    t = THEME[theme]
    ink, muted, grid, bg, rust, fl = t["ink"], t["muted"], t["grid"], t["bg"], t["rust"], t["flaeche"]
    if width >= 1100:
        VW, VH, L, R, Tp, B = 560, 340, 52, 28, 32, 50
    else:
        VW, VH, L, R, Tp, B = 350, 320, 52, 16, 28, 50
    plotW, plotH = VW - L - R, VH - Tp - B
    xa, xb = 1.0, 10.0
    ya, yb = 40.0, 100.0
    kpts = D.kipppunkt_market()
    # build market curve: ×1 = 64.41, then CSV, then ×10 = 92.76
    markt = [(1.0, 64.41)]
    for p in kpts:
        markt.append((p["k"], p["peak"]))
    markt.append((10.0, 92.76))
    # unique sorted
    seen, m2 = set(), []
    for k, v in sorted(markt):
        key = round(k, 2)
        if key in seen:
            continue
        seen.add(key)
        m2.append((k, v))
    # netz: ×1 64.41, ×2 60.82, ×5 54.99, ×10 50.43
    netz = [(1, 64.41), (2, 60.82), (5, 54.99), (10, 50.43)]

    def X(k):
        return mapx(k, xa, xb, L, plotW)
    def Y(g):
        return mapy(g, ya, yb, Tp, plotH)

    parts = [hatches(f"kipp{width}{theme}", rust, bg)]
    parts.append(rect(L, Tp, plotW, plotH, fl))
    xticks = [1, 2, 3, 5, 10] if width >= 1100 else [1, 2, 5, 10]  # ×4 weggelassen, sonst Kollision mit ×3,9
    yticks = [40, 50, 60, 70, 80, 90, 100] if width >= 1100 else [40, 60, 80, 100]
    for xv in xticks:
        parts.append(line(X(xv), Tp, X(xv), Tp + plotH, grid, 1))
        parts.append(tx(X(xv), Tp + plotH + 16, f"{D.TIMES}{D.dec(xv,0)}", muted, 12, "middle"))
    # explicit ×3,9 tick
    parts.append(line(X(3.9), Tp, X(3.9), Tp + plotH, grid, 1))
    parts.append(tx(X(3.9), Tp + plotH + 16, f"{D.TIMES}3,9", ink, 12, "middle", 500))
    for yv in yticks:
        parts.append(line(L, Y(yv), L + plotW, Y(yv), grid, 1))
        parts.append(tx(L - 8, Y(yv) + 4, D.dec(yv, 0), muted, 12, "end"))
    # 64,41 tick
    parts.append(tx(L - 8, Y(64.41) + 4, "64,41", ink, 12, "end", 500))
    parts.append(line(L, Y(64.41), L + plotW, Y(64.41), muted, 1, dash="4 3"))
    parts.append(line(L, Tp + plotH, L + plotW, Tp + plotH, ink, 1.25))
    parts.append(line(L, Tp, L, Tp + plotH, ink, 1.25))

    # hatch region from ×3,9 to ×10, above 64.41 (new peak zone)
    x39, x10 = X(3.9), X(10)
    y644, ytop = Y(64.41), Tp
    # market line after kipppunkt goes up to 92.76 — hatch the area above observed
    # polygon along market curve from 3.9
    hatch_pts = [(x39, y644)]
    for k, v in m2:
        if k >= 3.9 - 1e-9:
            hatch_pts.append((X(k), Y(v)))
    hatch_pts.append((x10, y644))
    hp = " ".join(f"{x:.2f},{y:.2f}" for x, y in hatch_pts)
    parts.append(f'<polygon points="{hp}" fill="url(#hatch-kipp{width}{theme})" opacity="0.9"/>')

    # netz line (behind), market line
    parts.append(poly([(X(k), Y(v)) for k, v in netz], ink, 2.5))
    # market solid until 3.8, dashed after 3.9 (Preisnehmer-Stresstest)
    pre = [(X(k), Y(v)) for k, v in m2 if k <= 3.8 + 1e-9]
    post = [(X(k), Y(v)) for k, v in m2 if k >= 3.8 - 1e-9]
    parts.append(poly(pre, rust, 2.25))
    parts.append(poly(post, rust, 2.25, dash="7 5"))
    # points at named
    parts.append(circ(X(2), Y(64.04), 4, rust, bg, 1))
    parts.append(circ(X(3.9), Y(64.43), 5, rust, bg, 1.25))
    parts.append(circ(X(10), Y(92.76), 5, rust, bg, 1.25))
    parts.append(circ(X(2), Y(60.82), 4, ink, bg, 1))
    parts.append(circ(X(10), Y(50.43), 5, ink, bg, 1.25))

    # Labels — INSIDE viewBox, at the last point, per width
    # Max. Erlös at ×10: left of point (end), "92,76 GW" — NO euro
    if width >= 1100:
        parts.append(tx(X(10) - 8, Y(92.76) - 8, "Max. Erlös  92,76" + D.NBSP + "GW", ink, 12, "end", 500))
        parts.append(tx(X(10) - 8, Y(50.43) + 16, "Netzdienlich  50,43" + D.NBSP + "GW", ink, 12, "end", 500))
        parts.append(tx(X(3.9) + 8, Y(64.43) - 12, "neue Spitze ab" + D.NBSP + D.TIMES + "3,9", ink, 12, "start", 500))
        parts.append(tx(X(3.9) + 8, Y(64.43) + 8, "64,43" + D.NBSP + "GW  ·  21.10. 14:00", muted, 12, "start"))
        parts.append(tx(L + 8, Y(64.41) - 8, "beobachtet 64,41", muted, 12, "start"))
        # "Preisnehmer, ohne Euro"
        parts.append(tx(L + plotW, 16, "Preisnehmer, keine Euro-Zahl für" + D.NBSP + D.TIMES + "5/" + D.TIMES + "10", muted, 12, "end"))
    else:
        # 390: end labels at last points, two lines, clamp
        parts.append(tx(X(10) - 4, Y(92.76) - 8, "Max. Erlös", ink, 12, "end", 500))
        parts.append(tx(X(10) - 4, Y(92.76) + 10, "92,76" + D.NBSP + "GW", ink, 12, "end"))
        parts.append(tx(X(10) - 4, Y(50.43) + 16, "Netzdienlich", ink, 12, "end", 500))
        parts.append(tx(X(10) - 4, Y(50.43) + 34, "50,43" + D.NBSP + "GW", ink, 12, "end"))
        # neue Spitze: not over 64,41 and not over ×3,9 tick — above the point, start, maybe two lines
        # Check collision with "beobachtet": put beobachtet left, neue Spitze right of ×3,9 but "92,76" is at top right.
        parts.append(tx(X(3.9) + 8, Y(80) + 4, "neue Spitze", ink, 12, "start", 500))
        parts.append(tx(X(3.9) + 8, Y(80) + 22, "ab" + D.NBSP + D.TIMES + "3,9", ink, 12, "start"))
        parts.append(tx(L + 6, Y(64.41) - 10, "64,41", muted, 12, "start"))

    parts.append(tx((L + L + plotW) / 2, VH - 8, "Zusatzflotte, Konvention" + D.NBSP + "(a)", muted, 12, "middle"))
    if width >= 1100:
        parts.append(tx(L, 16, "Kipppunkt  ·  Monatsspitze, GW", ink, 12, "start", 500))
    else:
        parts.append(tx(L, 16, "Monatsspitze, GW", ink, 12, "start", 500))

    return vg(VW, VH, "".join(parts), "Monatsspitze nach Flottengröße: neue Spitze ab mal 3,9 unter dem Markt-Fahrplan, Preisnehmer")


# --------------- Legal box ---------------

def legal_html():
    return f"""
<div class="legal">
  <h3>Die Front zeigt den Preis. Sie zahlt ihn nicht.</h3>
  <dl>
    <div>
      <dt>§ 118 Abs. 6 EnWG</dt>
      <dd>Speicher mit Inbetriebnahme bis 4.8.2029 sind 20 Jahre von Netzentgelten auf den Bezug befreit. Heute fehlt damit das laufende Entgelt-Signal.</dd>
    </div>
    <div>
      <dt>§ 17 Abs. 2b EnWG</dt>
      <dd>Flexible Netzanschlussvereinbarung: Begrenzung von Entnahme oder Einspeisung nach Höhe und Zeit. Angebot, keine Pflicht. Der Rechtsrahmen für den Leistungsdeckel.</dd>
    </div>
    <div>
      <dt>BGH EnVR 1/24</dt>
      <dd>Der VNB darf einen Baukostenzuschuss nach Leistungspreis verlangen, auch wenn der Speicher netzdienlich wirken kann. Der Zuschuss steuert die Anschlussgröße, nicht den laufenden Fahrplan.</dd>
    </div>
    <div>
      <dt>AgNes <span class="entwurf">Entwurf</span></dt>
      <dd>Konsultation abgeschlossen, am 12.11.2026 kein festgelegtes Recht. Inhalte erst nach Beschluss und Lektüre des Tenors. Kein AgNes-Tarif in diesem Modell.</dd>
    </div>
    <div>
      <dt>§ 14a EnWG</dt>
      <dd>Gilt nicht für diese Flotte (nicht Niederspannung).</dd>
    </div>
  </dl>
  <p class="foot">Kein Rechtsrat. Redispatch (§§ 13, 13a) ist ein betrieblicher Eingriff, keine Planfahrweise. §§ 11a/11b EnWG nur als Hinweis, kein eigener Modus in v1.</p>
</div>
"""


# --------------- Pages ---------------

def header(width):
    # No new nav item. Monat is current.
    nav = (
        "<nav class='links'>"
        "<span>Gestern</span><span>Vision</span><span>Tag</span>"
        "<em>Monat</em>"
        "<span>Ort</span><span>Methodik</span><span>Beiträge</span>"
        "</nav>"
    )
    if width < 768:
        nav = "<nav class='links'><em>Monat</em></nav>"
    return f'<header class="nav"><div class="inner"><div class="wordmark">SpeicherPilot</div>{nav}</div></header>'


def footer():
    return f"""
<footer class="page"><div class="inner">
  {D.CAPTION}. Zusatzflotte {D.TIMES}2, Flottenbasis {D.dec(D.FLEET_GW)}{D.NBSP}GW / {D.dec(D.FLEET_GWH)}{D.NBSP}GWh,
  Konvention (a): {D.TIMES}1 = 0 zusätzlich, {D.TIMES}k = (k{D.MINUS}1){D.TIMES}Basis.
  Preisnehmer, Day-Ahead DE-LU, Vollvoraussicht (Obergrenze). Euro nur für {D.TIMES}2, als Modellschätzung.
  Demo-Monat Oktober 2026. Quelle: Energy-Charts, battery-charts 31.10.2026.
</div></footer>
"""


def hero_block(theme, width, state):
    _ensure_series()
    stack = width < 1100
    full, _meta = g1_full_axis(theme, width, state)
    zoom = g1_zoom(theme, width, state)
    wrap = "hero-wrap stack" if stack else "hero-wrap"
    return f"""
<p class="scale">Monatsfront  ·  Monatsspitze, Oktober  ·  Zusatzflotte {D.TIMES}2 (4,64{D.NBSP}GW / 8,15{D.NBSP}GWh)</p>
<div class="display">0,36{D.NBSP}%</div>
<h1>für 70 Prozent<br />der Monatssenkung.</h1>
<p class="lead">Die volle Senkung kostet 0,30 von 34,09{D.NBSP}Mio.{D.NBSP}€. Modellschätzung, Endpunkte lexikographisch.</p>
{insight_html(state)}
<div class="{wrap}">
  {full}
  {zoom}
</div>
{slider_html(theme, width, state)}
<p class="fig">{D.CAPTION}. x = Day-Ahead-Erlös der Zusatzflotte. y = Senkung der Monatsspitze. Das 70/70-Feld liegt links der gesamten Front: jeder Punkt hält mehr als 99{D.NBSP}% des Erlöses. 70{D.NBSP}% der Senkung liegen auf dem Kompromiss.</p>
{values_table(state)}
"""


def g2_block(theme, width):
    return f"""
<section class="section" id="tageshorizont">
  <p class="mod-kicker">Tageshorizont  ·  Regel T  ·  nicht die Monatsscheibe</p>
  <h2>An keinem Tag erreicht der Markt 70 Prozent.</h2>
  <p class="lead">0 Win-win-Tage im Oktober. Maximum 46{D.NBSP}% am 06.10. Der 29.10., Tag der Monatsspitze, erreicht 10{D.NBSP}% — bei höchstem Tageserlös (2,11{D.NBSP}Mio.{D.NBSP}€, Modellschätzung).</p>
  {legend_g2(theme)}
  {g2_strip(theme, width)}
  <p class="fig">{D.CAPTION}. Klassen nach Regel T, Tageshorizont, SoC Start = Ende = 50{D.NBSP}%. Die Monatsscheibe des Monatsfahrplans erzeugt 17 falsche Win-win-Tage und ist nicht die Grundlage.</p>
  <div class="day-links">
    <a href="/tag/2026-10-21"><strong>21.10.</strong> <span>hebt die Spitze um 1,31{D.NBSP}GW  ·  auf /tag</span></a>
    <a href="/tag/2026-10-29"><strong>29.10.</strong> <span>Preis eine Stunde vor der Spitze  ·  auf /tag</span></a>
  </div>
</section>
"""


def g3_block(theme, width):
    _ensure_series()
    a = g3_day(theme, width, "2026-10-21", SERIES_21, D.TAG_21,
               "21.10.", "Markt lädt mittags, neue Tagesspitze 55,60" + D.NBSP + "GW")
    b = g3_day(theme, width, "2026-10-29", SERIES_29, D.TAG_29,
               "29.10.", "Preismaximum 17:15, Restlastspitze 18:15")
    wrap = "g3-wrap" if width >= 1100 else "g3-wrap stack"
    return f"""
<section class="section" id="beispieltage">
  <p class="mod-kicker">Tageshorizont  ·  dieselben zwei Tage  ·  Übergang zu /tag</p>
  <h2>Am 21.10. lädt der Markt mittags. Am 29.10. liegt der Preis eine Stunde vor der Spitze.</h2>
  <p class="lead">Drei Fahrpläne auf derselben Restlast. Am 21.10. kostet der 70-Prozent-Kompromiss 13{D.NBSP}% des Tageserlöses (0,56 statt 0,65{D.NBSP}Mio.{D.NBSP}€) — deutlich mehr als im Monatsmaßstab. Graues Band 23–24 Uhr: SoC-Rückkehr, Modellartefakt, kein Netzeffekt.</p>
  {g3_legend_html(theme)}
  <div class="{wrap}">{a}{b}</div>
  <p class="fig">{D.CAPTION}. Gleiche y-Achse 20–70{D.NBSP}GW auf beiden Tagen: die gehobene Spitze am 21.10. (55,60) bleibt unter der Monatsspitze (64,41); dasselbe Laden überschreitet sie ab {D.TIMES}3,9.</p>
</section>
"""


def g4_block(theme, width):
    wrap = "g4-wrap" if width >= 1100 else "g4-wrap stack"
    return f"""
<section class="section" id="fnav">
  <p class="mod-kicker">Vertragsform  ·  stilisiert  ·  national</p>
  <h2>Was wirkt, ist ein Leistungsdeckel — nicht das Abendfenster.</h2>
  <p class="lead">Ein Entnahmeverbot 16–21 Uhr landet am Markt-Ende der Front. Der Leistungsdeckel auf die Restlast nach Speicher ist derselbe ε-Schnitt, den der Schieber schon erzeugt. Neue Monatsspitze unter dem Markt-Fahrplan ab {D.TIMES}3,9 (Preisnehmer, ohne Euro für {D.TIMES}5/{D.TIMES}10).</p>
  <div class="{wrap}">
    <div style="flex:1;min-width:0">{g4_fnav_panel(theme, width)}</div>
    <div style="flex:1;min-width:0">{g4_kipppunkt(theme, width)}</div>
  </div>
  <p class="fig">{D.CAPTION}. {D.TIMES}10 Markt 92,76{D.NBSP}GW, {D.TIMES}10 netzdienlich 50,43{D.NBSP}GW. Keine Euro-Beträge jenseits von {D.TIMES}2.</p>
</section>
"""


def page(theme, width, state="kompromiss", kind="seite"):
    t = THEME[theme]
    body_inner = ""
    if kind in ("seite", "hero", "schieber"):
        body_inner += '<main class="inner">' + hero_block(theme, width, state) + "</main>" if kind != "seite" else ""
    if kind == "hero":
        content = f"""{header(width)}<main class="inner">{hero_block(theme, width, state)}</main>"""
    elif kind == "schieber":
        content = f"""{header(width)}<main class="inner">{hero_block(theme, width, state)}</main>"""
    elif kind == "seite":
        content = f"""{header(width)}<main class="inner">
          <div class="kicker-row">
            <span class="kicker">Fahrweisen  ·  Oktober 2026  ·  Monatshorizont</span>
            <span class="chip">Modell</span>
          </div>
          {hero_block(theme, width, state)}
          {g2_block(theme, width)}
          {g3_block(theme, width)}
          {g4_block(theme, width)}
          <section class="section" id="rechtsrahmen">
            <p class="mod-kicker">Methodik  ·  Rechtsrahmen</p>
            {legal_html()}
          </section>
        </main>{footer()}"""
    elif kind == "uebersicht":
        content = f"""{header(width)}<main class="inner">
          <div class="kicker-row"><span class="kicker">Vorentwurf  ·  Übersicht</span><span class="chip">Modell</span></div>
          <h1 style="max-width:24ch;margin-bottom:24px">Simulator der Fahrweisen.</h1>
          {hero_block(theme, width, "kompromiss")}
          {g2_block(theme, width)}
          {g3_block(theme, width)}
          {g4_block(theme, width)}
          <section class="section">{legal_html()}</section>
        </main>{footer()}"""
    else:
        content = ""
    return f"""<!DOCTYPE html>
<html lang="de" class="{theme}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width={width}"/>
<title>SpeicherPilot · Fahrweisen</title>
<style>{css(theme, width)}</style>
</head>
<body>
{content}
</body>
</html>
"""


def write_all():
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = []
    # full pages
    for w in (390, 1280):
        for th in ("light", "dark"):
            name = f"seite_{w}_{th}.html"
            (OUT / name).write_text(page(th, w, "kompromiss", "seite"), encoding="utf-8")
            jobs.append(name)
            name = f"hero_{w}_{th}.html"
            (OUT / name).write_text(page(th, w, "kompromiss", "hero"), encoding="utf-8")
            jobs.append(name)
    # slider states: 390+1280 light (3), plus 1280 dark default already in seite
    for w in (390, 1280):
        for st in ("erloes", "kompromiss", "netz"):
            name = f"schieber_{st}_{w}_light.html"
            (OUT / name).write_text(page("light", w, st, "schieber"), encoding="utf-8")
            jobs.append(name)
    (OUT / "uebersicht.html").write_text(page("light", 1280, "kompromiss", "uebersicht"), encoding="utf-8")
    jobs.append("uebersicht.html")
    print("wrote", len(jobs), "html files")
    for j in jobs:
        print(" ", j)


if __name__ == "__main__":
    write_all()
