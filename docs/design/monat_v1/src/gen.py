#!/usr/bin/env python3
"""Vorentwurf SpeicherPilot /monat — HTML/SVG-Skizzen. Kein Bau.
Alle Zahlen sind Platzhalter (Beispielwerte aus konzept_monat_v1.md, alte ×k-Zählung).
"""
from __future__ import annotations
from pathlib import Path

OUT = Path(__file__).resolve().parent

FONT_SANS = "/usr/share/fonts/truetype/sand-box/google/Space Grotesk/SpaceGrotesk-VariableFont_wght.ttf"
FONT_MONO = "/usr/share/fonts/truetype/sand-box/google/JetBrains Mono/JetBrainsMono-VariableFont_wght.ttf"

# --- Beispielwerte (Platzhalter, alte Konvention k-mal zusätzlich) ---
OBS = 64.41  # angezeigt 64,4
# höchste Restlast GW
SPITZE = {1: 60.86, 2: 58.80, 5: 54.06, 10: 49.77}
UEBERS = {1: 62.16, 2: 60.86, 5: 58.37, 10: 56.50}
# Markt linear ab ×3 (keine Endzahl im Text)
MARKT = {3: 64.70, 3.5: 66.99, 4: 69.28, 4.5: 71.57, 5: 73.86,
         5.5: 76.15, 6: 78.44, 6.5: 80.73, 7: 83.02, 7.5: 85.31,
         8: 87.60, 8.5: 89.89, 9: 92.18, 9.5: 94.47, 10: 96.76}
MARKT_X1 = 64.04
EURO_X1 = "33,5\u00A0Mio\u00A0€"

# Spitzensenkung GW: 1,76 h / 2 h / 4 h
DAUER = {
    1:  (3.59, 3.92, 4.64),
    2:  (5.68, 6.23, 9.29),
    5:  (10.43, 11.10, 15.56),
    10: (14.78, 15.56, 18.31),
}

POOL = 134.2  # GWh
POOL_PCT = {1: 0.42, 2: 0.61, 5: 0.84, 10: 1.00}
UE_SENK = {1: 2.24, 2: 3.55, 5: 6.03, 10: 7.91}
SP_SENK = {1: 3.55, 2: 5.60, 5: 10.34, 10: 14.63}  # Vergleich, Konzept 14,63

# GW-Unterzeile ×k (Flotte 4,64 GW)
GW_TICK = {1: "4,6", 2: "9,3", 3: "13,9", 5: "23", 10: "46"}


def de(x: float, n: int = 1) -> str:
    return f"{x:.{n}f}".replace(".", ",")


def gw(x: float, n: int = 1) -> str:
    return f"{de(x, n)}\u00A0GW"


def minus(x: float, n: int = 2) -> str:
    return f"\u2212{de(x, n)}\u00A0GW"


def css() -> str:
    return f"""
@font-face{{font-family:'Space Grotesk';src:url('file://{FONT_SANS}') format('truetype');font-weight:300 700;font-style:normal;font-display:block}}
@font-face{{font-family:'JetBrains Mono';src:url('file://{FONT_MONO}') format('truetype');font-weight:100 800;font-style:normal;font-display:block}}
:root{{
  --bg:#F6F6F3;--ink:#101214;--muted:#43474C;--linie:#DADAD3;--flaeche:#FFFFFF;
  --gridline:#E4E4DC;--rust:#B4532A;--rust-tint:rgba(180,83,42,.10);--rust-hatch:rgba(180,83,42,.18);
  --type-12:0.75rem;--type-14:0.875rem;--type-16:1rem;--type-18:1.125rem;
  --type-24:1.5rem;--type-32:2rem;--type-48:3rem;--type-display:3.5rem;
  --lh-body:1.55;--lh-heading:1.15;--lh-tight:1.1;--lh-meta:1.5;
  --weight-regular:400;--weight-medium:500;--weight-semibold:600;
  --tracking-caps:.08em;--tracking-headline:-.03em;--tracking-title:-.02em;--tracking-meta:.06em;
  --space-1:.25rem;--space-2:.5rem;--space-3:.75rem;--space-4:1rem;--space-5:1.25rem;
  --space-6:1.5rem;--space-8:2rem;--space-10:2.5rem;--space-12:3rem;
}}
.dark{{
  --bg:#0B0D0F;--ink:#E9EEF2;--muted:#9EA3A9;--linie:#262B31;--flaeche:#121417;
  --gridline:#1F2529;--rust:#B4532A;--rust-tint:rgba(180,83,42,.20);--rust-hatch:rgba(180,83,42,.32);
}}
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{background:var(--bg);color:var(--ink);font-family:'Space Grotesk',sans-serif;
  -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}}
body{{overflow-x:visible}}
.mono,.num,table,figcaption,svg text{{font-family:'JetBrains Mono',ui-monospace,monospace}}
.num{{font-variant-numeric:tabular-nums lining-nums;font-feature-settings:'tnum' 1,'kern' 1}}
.wrap{{margin:0 auto;padding:0 20px}}
body.w390 .wrap{{width:390px;padding:0 20px}}
body.w1280 .wrap{{width:1280px;padding:0 64px}}
.nav{{display:flex;justify-content:space-between;align-items:center;height:56px;
  border-bottom:1px solid var(--linie);padding:0;position:relative}}
body.w390 .nav-inner,body.w1280 .nav-inner{{display:flex;justify-content:space-between;align-items:center;height:56px}}
.nav b{{font-weight:600;font-size:var(--type-16);letter-spacing:-.01em}}
.nav .page{{font-family:'JetBrains Mono',monospace;font-size:var(--type-12);font-weight:500;
  letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--ink);
  border-bottom:2px solid var(--rust);padding:16px 0 14px}}
.eyebrow{{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-top:16px}}
.eb-text{{font-family:'JetBrains Mono',monospace;font-size:var(--type-12);font-weight:500;
  letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--muted);line-height:var(--lh-meta)}}
.chip{{font-family:'JetBrains Mono',monospace;font-size:var(--type-12);font-weight:500;
  letter-spacing:var(--tracking-caps);text-transform:uppercase;line-height:1;
  border:1px solid var(--linie);border-radius:4px;padding:6px 8px;color:var(--ink);background:transparent}}
.chip-model{{border-color:var(--ink)}}
.chip-ph{{color:var(--muted)}}
h1{{font-weight:600;letter-spacing:var(--tracking-headline);line-height:var(--lh-heading);margin-top:12px;max-width:20ch}}
body.w390 h1{{font-size:var(--type-32)}}
body.w1280 h1{{font-size:var(--type-48);max-width:28ch;margin-top:16px}}
h2{{font-weight:600;letter-spacing:var(--tracking-title);line-height:var(--lh-heading);margin-top:0;max-width:24ch}}
body.w390 h2{{font-size:var(--type-24)}}
body.w1280 h2{{font-size:var(--type-32)}}
.lead{{font-size:var(--type-16);font-weight:400;line-height:var(--lh-body);margin-top:12px;max-width:52ch;color:var(--ink)}}
body.w1280 .lead{{font-size:var(--type-18);margin-top:16px}}
.insight{{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0 8px;padding:12px 0;
  border-top:1px solid var(--linie);border-bottom:1px solid var(--linie)}}
.insight .fig{{font-family:'JetBrains Mono',monospace;font-weight:500;font-variant-numeric:tabular-nums;
  font-size:var(--type-24);line-height:var(--lh-tight);letter-spacing:var(--tracking-title)}}
body.w1280 .insight .fig{{font-size:var(--type-32)}}
.insight .lbl{{font-family:'JetBrains Mono',monospace;font-size:var(--type-12);color:var(--muted);
  margin-top:6px;line-height:var(--lh-meta)}}
figure{{margin:16px 0 0}}
svg{{display:block;width:100%;height:auto}}
.val{{margin-top:16px;width:100%;border-collapse:collapse;font-size:var(--type-12);line-height:1.45}}
.val th,.val td{{padding:8px 10px 8px 0;text-align:left;vertical-align:top;font-weight:400;color:var(--ink)}}
.val th{{color:var(--muted);font-weight:500;border-bottom:1px solid var(--linie)}}
.val td{{border-bottom:1px solid var(--linie)}}
.val th:not(:first-child),.val td:not(:first-child){{text-align:right;padding-right:0;padding-left:10px}}
.val .ph{{color:var(--muted)}}
.val .note{{color:var(--muted);font-weight:400;display:block;margin-top:2px}}
.val caption{{caption-side:bottom;text-align:left;color:var(--muted);font-size:var(--type-12);
  padding-top:8px;font-weight:400;letter-spacing:0;text-transform:none}}
.val .hi{{background:var(--rust-tint)}}
.disclaimer{{font-family:'JetBrains Mono',monospace;font-size:var(--type-12);color:var(--muted);
  margin-top:12px;line-height:var(--lh-meta)}}
.section{{border-top:1px solid var(--linie);margin-top:48px;padding-top:32px}}
body.w1280 .section{{margin-top:64px;padding-top:48px}}
.sec-head{{margin-bottom:8px}}
footer.site{{margin-top:64px;padding:24px 0 40px;border-top:1px solid var(--linie);
  font-family:'JetBrains Mono',monospace;font-size:var(--type-12);color:var(--muted);line-height:var(--lh-meta)}}
footer.site p+p{{margin-top:8px}}
.ph-banner{{font-family:'JetBrains Mono',monospace;font-size:var(--type-12);color:var(--muted);
  margin-top:6px;line-height:var(--lh-meta)}}
/* isolate cards */
body.isolate{{}}
body.isolate .wrap{{padding-top:20px;padding-bottom:28px}}
body.w1280.isolate .wrap{{padding-top:32px;padding-bottom:40px}}
body.uebersicht .wrap{{padding-bottom:48px}}
.uv-head{{margin-top:24px;margin-bottom:8px}}
.uv-grid{{display:block}}
.sr{{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}}
a{{color:var(--ink);text-decoration:none}}
"""


def svg_open(w, h, title, desc, uid) -> str:
    return (
        f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" '
        f'aria-labelledby="{uid}-t {uid}-d" xmlns="http://www.w3.org/2000/svg">'
        f'<title id="{uid}-t">{esc(title)}</title>'
        f'<desc id="{uid}-d">{esc(desc)}</desc>'
    )


def esc(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
             .replace('"', "&quot;"))


def txt(x, y, s, *, size=12, fill="var(--muted)", anchor="start", weight=400,
        dy=0, cls=""):
    dya = f' dy="{dy}"' if dy else ""
    c = f' class="{cls}"' if cls else ""
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}"{dya}{c} '
        f'font-family="JetBrains Mono, monospace" font-size="{size}" font-weight="{weight}" '
        f'fill="{fill}" font-variant-numeric="tabular-nums">{s}</text>'
    )


def hatch_defs(uid: str) -> str:
    return f'''
<defs>
  <pattern id="{uid}-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="7" stroke="var(--rust)" stroke-width="1.25"/>
  </pattern>
  <clipPath id="{uid}-plot"><rect x="0" y="0" width="10000" height="10000"/></clipPath>
</defs>'''


# ---------------------------------------------------------------------------
# GRAPH 1 — Hero
# ---------------------------------------------------------------------------
def graph1_svg(width: int, dark: bool) -> str:
    """Hero: höchste Restlast, ×1–×10, Referenz 64,4, Markt ab ×3 schraffiert."""
    wide = width >= 1000
    # canvas
    if wide:
        W, H = width, 460
        L, R, T, B = 52, 188, 32, 62
    else:
        W, H = width, 348
        L, R, T, B = 38, 26, 24, 54
    x0, x1 = L, W - R
    y0, y1 = T, H - B  # top, bottom of plot
    pw, ph = x1 - x0, y1 - y0

    def X(k: float) -> float:
        return x0 + (k - 1) / 9 * pw

    def Y(g: float) -> float:
        return y0 + (100 - g) / 60 * ph

    uid = f"g1-{'w' if wide else 'n'}"
    parts = [svg_open(W, H,
                      "Höchste Restlast des Monats nach Fahrweise, Oktober 2026 (Beispielwerte)",
                      "Spitzenorientiert fällt die höchste Restlast von 60,9 auf 49,8 Gigawatt. "
                      "Überschuss fällt schwächer auf 56,5. Die Marktlinie ab mal 3 steigt über die "
                      "beobachtete Spitze von 64,4 Gigawatt und ist schraffiert, ohne Preisrückwirkung. "
                      "Alle Zahlen sind Platzhalter.",
                      uid)]
    # clip to plot for tint and hatch
    parts.append(
        f'<defs>'
        f'<pattern id="{uid}-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
        f'<line x1="0" y1="0" x2="0" y2="7" stroke="var(--rust)" stroke-width="1.25"/>'
        f'</pattern>'
        f'<clipPath id="{uid}-clip"><rect x="{x0}" y="{y0}" width="{pw}" height="{ph}"/></clipPath>'
        f'</defs>'
    )

    # tint above reference (neue Spitze)
    yref = Y(OBS if False else 64.4)
    parts.append(
        f'<g clip-path="url(#{uid}-clip)">'
        f'<rect x="{x0}" y="{y0}" width="{pw}" height="{yref-y0}" fill="var(--rust-tint)"/>'
        f'</g>'
    )

    # horizontal grid + y ticks
    yticks = [40, 60, 80, 100] if not wide else [40, 50, 60, 70, 80, 90, 100]
    for g in yticks:
        y = Y(g)
        parts.append(f'<line x1="{x0}" x2="{x1}" y1="{y}" y2="{y}" stroke="var(--gridline)" stroke-width="1"/>')
        parts.append(txt(x0 - 8, y + 4, de(g, 0), size=12, fill="var(--muted)", anchor="end"))
    # unit
    parts.append(txt(x0 - 8, y0 - 8, "GW", size=12, fill="var(--muted)", anchor="end"))
    # 64,4 tick (emphasized)
    parts.append(txt(x0 - 8, yref + 4, "64,4", size=12, fill="var(--ink)", anchor="end", weight=500))

    # reference line
    parts.append(
        f'<line x1="{x0}" x2="{x1}" y1="{yref}" y2="{yref}" stroke="var(--ink)" '
        f'stroke-width="1.25" stroke-dasharray=""/>'
    )

    # x ticks
    xticks = [1, 2, 3, 5, 10]
    for k in xticks:
        x = X(k)
        parts.append(f'<line x1="{x}" x2="{x}" y1="{y1}" y2="{y1+5}" stroke="var(--muted)" stroke-width="1"/>')
        wt = 500 if k == 3 else 400
        parts.append(txt(x, y1 + 20, f"\u00d7{k}", size=12, fill="var(--ink)" if k == 3 else "var(--muted)",
                         anchor="middle", weight=wt))
        parts.append(txt(x, y1 + 36, GW_TICK[k], size=12, fill="var(--muted)", anchor="middle"))
    # GW subtitle unit, right of last tick or as a small label at left of subtitle row
    if wide:
        parts.append(txt(x1 + 10, y1 + 36, "GW", size=12, fill="var(--muted)", anchor="start"))
    else:
        # place "GW" after last subtitle if it fits; last is at X(10)=x1, "46" is short.
        # Put a single "GW" at the left of the subtitle row, under the axis origin.
        parts.append(txt(x0, y1 + 36, "", size=12))  # noop placeholder removed below
        # actually annotate at far right inside, next to 46 — skip to avoid overlap with 46.
        # A caption under the SVG says the Unterzeile is GW. We'll put "GW" just right of 46 if space.
        if R >= 8:
            parts.append(txt(x1, y1 + 36, "", size=12))
    # remove the empty texts - I'll just put GW at bottom-left of subtitle, but x0 has "×1" and "4,6" centered.
    # Cleaner: axis caption in HTML. Skip extra GW on 390.

    # "neue Spitze" in the tint, top
    if wide:
        parts.append(txt(x1 - 10, y0 + 16, "neue Spitze", size=12, fill="var(--muted)", anchor="end"))
    else:
        parts.append(txt((x0 + x1) * 0.55, y0 + 14, "neue Spitze", size=12, fill="var(--muted)", anchor="middle"))

    # "Oktober, beobachtet" — left, high in the tint, leader down to the reference.
    if wide:
        parts.append(txt(x0 + 10, yref - 10, "Oktober, beobachtet", size=12, fill="var(--ink)", weight=500))
    else:
        # Two lines clearly above the reference and the ×3-Marker.
        parts.append(txt(x0 + 8, yref - 34, "Oktober,", size=12, fill="var(--ink)", weight=500))
        parts.append(txt(x0 + 8, yref - 20, "beobachtet", size=12, fill="var(--ink)", weight=500))

    # Market hatch area (from ×3 along curve down to reference)
    mks = sorted(MARKT.items())
    hatch_pts = [(X(k), Y(v)) for k, v in mks]
    # close along reference
    path_h = f"M{hatch_pts[0][0]:.1f},{yref:.1f} "
    path_h += " ".join(f"L{x:.1f},{y:.1f}" for x, y in hatch_pts)
    path_h += f" L{hatch_pts[-1][0]:.1f},{yref:.1f} Z"
    parts.append(
        f'<g clip-path="url(#{uid}-clip)">'
        f'<path d="{path_h}" fill="url(#{uid}-hatch)" fill-opacity=".9"/>'
        f'</g>'
    )

    # Überschuss line (solid muted)
    ue_ks = [1, 2, 5, 10]
    ue_pts = [(X(k), Y(UEBERS[k])) for k in ue_ks]
    d_ue = f"M{ue_pts[0][0]:.1f},{ue_pts[0][1]:.1f} " + " ".join(f"L{x:.1f},{y:.1f}" for x, y in ue_pts[1:])
    parts.append(
        f'<path d="{d_ue}" fill="none" stroke="var(--muted)" stroke-width="2" '
        f'stroke-linejoin="round" stroke-linecap="round"/>'
    )
    for x, y in ue_pts:
        parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.2" fill="var(--bg)" stroke="var(--muted)" stroke-width="2"/>')

    # Spitze line (solid ink, protagonist)
    sp_pts = [(X(k), Y(SPITZE[k])) for k in ue_ks]
    d_sp = f"M{sp_pts[0][0]:.1f},{sp_pts[0][1]:.1f} " + " ".join(f"L{x:.1f},{y:.1f}" for x, y in sp_pts[1:])
    parts.append(
        f'<path d="{d_sp}" fill="none" stroke="var(--ink)" stroke-width="2.5" '
        f'stroke-linejoin="round" stroke-linecap="round"/>'
    )
    for x, y in sp_pts:
        parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.6" fill="var(--ink)"/>')

    # Markt dashed rust from ×3
    mk_pts = [(X(k), Y(v)) for k, v in mks]
    d_mk = f"M{mk_pts[0][0]:.1f},{mk_pts[0][1]:.1f} " + " ".join(f"L{x:.1f},{y:.1f}" for x, y in mk_pts[1:])
    parts.append(
        f'<path d="{d_mk}" fill="none" stroke="var(--rust)" stroke-width="2.25" '
        f'stroke-dasharray="7 5" stroke-linejoin="round" stroke-linecap="butt"/>'
    )
    # start marker at ×3, no end marker (kein Endwert)
    parts.append(
        f'<circle cx="{mk_pts[0][0]:.1f}" cy="{mk_pts[0][1]:.1f}" r="3.6" '
        f'fill="var(--bg)" stroke="var(--rust)" stroke-width="2"/>'
    )

    # End labels
    # Spitze: left of last point, above
    sx, sy = sp_pts[-1]
    ux, uy = ue_pts[-1]
    if wide:
        # labels to the RIGHT of the plot
        parts.append(txt(x1 + 12, sy + 4, "Spitze", size=14, fill="var(--ink)", weight=500))
        parts.append(txt(x1 + 12, uy + 4, "Überschuss", size=14, fill="var(--muted)", weight=500))
        # Markt label at mid-rise, right — no hyphenation of Preisrückwirkung
        my = Y(82)
        parts.append(txt(x1 + 12, my, "Markt", size=14, fill="var(--ink)", weight=500))
        parts.append(txt(x1 + 12, my + 18, "ohne Preisrückwirkung", size=12, fill="var(--muted)"))
    else:
        # inside, end-anchored, with knockout rects
        def knockout(x, y, w, h, anchor="end"):
            if anchor == "end":
                return f'<rect x="{x-w}" y="{y-h+2}" width="{w}" height="{h}" fill="var(--bg)" fill-opacity=".85" rx="1"/>'
            return f'<rect x="{x}" y="{y-h+2}" width="{w}" height="{h}" fill="var(--bg)" fill-opacity=".85" rx="1"/>'

        parts.append(knockout(sx - 6, sy - 8, 52, 16))
        parts.append(txt(sx - 6, sy - 8, "Spitze", size=12, fill="var(--ink)", anchor="end", weight=500))
        parts.append(knockout(ux - 6, uy - 8, 84, 16))
        parts.append(txt(ux - 6, uy - 8, "Überschuss", size=12, fill="var(--muted)", anchor="end", weight=500))
        # Markt-Label links der Linie bei ≈90 GW, Knockout, klar über dem Oktober-Label.
        mlx, mly = X(8.0) - 14, Y(90)
        parts.append(knockout(mlx, mly, 48, 16))
        parts.append(txt(mlx, mly, "Markt", size=12, fill="var(--ink)", anchor="end", weight=500))
        parts.append(knockout(mlx, mly + 15, 158, 16))
        parts.append(txt(mlx, mly + 15, "ohne Preisrückwirkung", size=12, fill="var(--ink)", anchor="end"))


    parts.append("</svg>")
    return "\n".join(parts)


def graph1_values() -> str:
    return f"""
<table class="val num">
  <caption>Werte fest unter dem Graph, kein Tooltip. Alle Zahlen Platzhalter. Euro nur bei \u00d71 als Modellschätzung. Keine Marktzahl für \u00d75/\u00d710.</caption>
  <thead>
    <tr><th scope="col">Fahrweise</th><th scope="col">\u00d71</th><th scope="col">\u00d710</th></tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Spitze</th>
      <td>{gw(SPITZE[1], 1)}</td>
      <td>{gw(SPITZE[10], 1)}</td>
    </tr>
    <tr>
      <th scope="row">Überschuss</th>
      <td>{gw(UEBERS[1], 1)}</td>
      <td>{gw(UEBERS[10], 1)}</td>
    </tr>
    <tr>
      <th scope="row">Markt</th>
      <td>{gw(MARKT_X1, 1)}<span class="note">{EURO_X1} Modellschätzung</span></td>
      <td>\u2014<span class="note">ohne Preisrückwirkung</span></td>
    </tr>
  </tbody>
</table>
"""


def graph1_block(width: int, dark: bool, heading=True) -> str:
    h1 = ""
    insight = f"""
<div class="insight">
  <div><div class="fig num">{gw(SPITZE[10], 1)}</div><div class="lbl">Spitze \u00b7 \u00d710 \u00b7 fällt</div></div>
  <div><div class="fig num">ab\u00A0\u00d73</div><div class="lbl">Markt über 64,4\u00A0GW, ohne Preisrückwirkung</div></div>
</div>
"""
    lead = ('<p class="lead">Spitzenorientiert sinkt das Oktobermaximum. '
            "Nach Preis steigt es ab etwa \u00d73 über die beobachtete Spitze. "
            "Die Marktlinie ab \u00d73 ist ein Stresstest, keine Prognose.</p>")
    if heading:
        top = (f'<div class="sec-head"><p class="eb-text" style="margin:0">Kernantwort 1 \u00b7 Hero</p>'
               f'<h1>Dieselbe Flotte senkt die Spitze<br>oder hebt sie.</h1>{lead}</div>')
    else:
        top = ""
    return f"""
<section id="hero" aria-labelledby="h-hero">
  {top if heading else ""}
  {insight}
  <figure>
    {graph1_svg(width, dark)}
    <figcaption class="disclaimer">national, kein Netzengpass, Vollvoraussicht \u00b7 Modell \u00b7 Beispielwerte</figcaption>
  </figure>
  {graph1_values()}
</section>
"""


# ---------------------------------------------------------------------------
# GRAPH 3 — Stunden, nicht Gigawatt
# ---------------------------------------------------------------------------
def graph3_svg(width: int, dark: bool) -> str:
    wide = width >= 1000
    if wide:
        W, H = width, 400
        L, R, T, B = 52, 24, 36, 48
    else:
        W, H = width, 320
        L, R, T, B = 38, 10, 28, 44
    x0, x1 = L, W - R
    y0, y1 = T, H - B
    pw, ph = x1 - x0, y1 - y0
    ymax = 20.0  # GW Senkung

    stages = [1, 2, 5, 10]
    # categorical centers
    n = len(stages)
    gap = pw / n
    def CX(k):
        i = stages.index(k)
        return x0 + (i + 0.5) * gap

    def Y(g):
        return y1 - g / ymax * ph

    uid = f"g3-{'w' if wide else 'n'}"
    parts = [svg_open(W, H,
                      "Spitzensenkung nach Flottengröße und Speicherdauer (Beispielwerte)",
                      "Je Stufe drei Punkte für 1,76 Stunden, 2 Stunden und 4 Stunden. "
                      "Der 4-Stunden-Punkt liegt immer deutlich höher. "
                      "Mal 5 mit 4 Stunden senkt die Spitze genauso stark wie mal 10 mit 1,76 Stunden, mit halb so viel Leistung. "
                      "Alle Zahlen sind Platzhalter.",
                      uid)]

    # grid
    for g in [0, 5, 10, 15, 20]:
        y = Y(g)
        parts.append(f'<line x1="{x0}" x2="{x1}" y1="{y}" y2="{y}" stroke="var(--gridline)" stroke-width="1"/>')
        parts.append(txt(x0 - 8, y + 4, de(g, 0), size=12, fill="var(--muted)", anchor="end"))
    parts.append(txt(x0 - 8, y0 - 10, "GW", size=12, fill="var(--muted)", anchor="end"))

    # x labels
    for k in stages:
        x = CX(k)
        parts.append(txt(x, y1 + 20, f"\u00d7{k}", size=12, fill="var(--ink)", anchor="middle", weight=500))
        parts.append(txt(x, y1 + 36, GW_TICK[k] + "\u00A0GW", size=12, fill="var(--muted)", anchor="middle"))

    dodge = 12 if wide else 10
    r176, r2, r4 = 4.0, 4.0, 6.0

    # legend (top, inside)
    lx = x0 + 4
    ly = y0 + 4
    # we'll put legend as HTML above; a compact in-svg legend on the left-top empty area (high y is empty at ×1)
    # 4h max at ×1 is 4.64, so above Y(8) is empty on the left. On the right ×10 goes to 18.31.
    # Place legend top-left.
    def swatch(x, y, kind):
        if kind == "176":
            return f'<circle cx="{x}" cy="{y}" r="4" fill="var(--ink)"/>'
        if kind == "2":
            return (f'<circle cx="{x}" cy="{y}" r="4" fill="var(--bg)" stroke="var(--muted)" stroke-width="1.75"/>')
        return f'<circle cx="{x}" cy="{y}" r="6" fill="var(--rust)"/>'

    # legend row at very top, horizontally
    leg_y = y0 - 6 if wide else y0 - 4
    # actually y0-6 may clip at 0; T is 28/36 so y0-14 is around 14-22. Use T area.
    # I'll put legend in HTML. Skip in-svg legend to avoid clip. 

    # stems and points
    labeled_4h = []
    for k in stages:
        a, b, c = DAUER[k]  # 1.76, 2, 4
        cx = CX(k)
        x176, x2, x4 = cx - dodge, cx, cx + dodge
        y176, y2, y4 = Y(a), Y(b), Y(c)
        # stem
        parts.append(
            f'<line x1="{cx}" x2="{cx}" y1="{y176}" y2="{y4}" stroke="var(--linie)" stroke-width="2"/>'
        )
        # 1.76 ink filled
        parts.append(f'<circle cx="{x176}" cy="{y176}" r="{r176}" fill="var(--ink)"/>')
        # 2 h hollow muted
        parts.append(
            f'<circle cx="{x2}" cy="{y2}" r="{r2}" fill="var(--bg)" stroke="var(--muted)" stroke-width="1.75"/>'
        )
        # 4 h rust filled, larger
        parts.append(f'<circle cx="{x4}" cy="{y4}" r="{r4}" fill="var(--rust)"/>')
        # 4h value labels above the rust dots
        label = minus(c, 2)
        parts.append(txt(x4, y4 - 12, label, size=12, fill="var(--ink)", anchor="middle", weight=500))
        labeled_4h.append((x4, y4, c))

    # label ×10 1,76 h for the comparison (the punchline)
    a10 = DAUER[10][0]
    x176_10 = CX(10) - dodge
    y176_10 = Y(a10)
    parts.append(txt(x176_10 - 8, y176_10 + 4, minus(a10, 2), size=12, fill="var(--ink)", anchor="end", weight=500))

    # comparison cue: ×5 4h vs ×10 1.76h
    x5_4 = CX(5) + dodge
    y5_4 = Y(DAUER[5][2])
    # a thin ink line almost horizontal
    # start a bit right of ×5 label, end a bit left of ×10 1.76 label
    x_a = x5_4 + 8
    x_b = x176_10 - 70 if not wide else x176_10 - 90
    y_mid = (y5_4 + y176_10) / 2
    if wide:
        parts.append(
            f'<line x1="{x_a}" x2="{x_b}" y1="{y5_4}" y2="{y176_10}" '
            f'stroke="var(--ink)" stroke-width="1" stroke-dasharray="3 3"/>'
        )
        mx, my = (x_a + x_b) / 2, (y5_4 + y176_10) / 2 - 8
        parts.append(
            f'<rect x="{mx-42}" y="{my-12}" width="84" height="16" fill="var(--bg)" fill-opacity=".92"/>'
        )
        parts.append(txt(mx, my + 2, "genauso stark", size=12, fill="var(--ink)", anchor="middle", weight=500))


    parts.append("</svg>")
    return "\n".join(p for p in parts if p)


def graph3_legend() -> str:
    return """
<div class="g3-leg" style="display:flex;flex-wrap:wrap;gap:16px 24px;margin:12px 0 4px;
  font-family:'JetBrains Mono',monospace;font-size:var(--type-12);color:var(--ink)">
  <span style="display:flex;align-items:center;gap:8px">
    <svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="var(--ink)"/></svg>
    1,76\u00A0h
  </span>
  <span style="display:flex;align-items:center;gap:8px">
    <svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="var(--bg)" stroke="var(--muted)" stroke-width="1.75"/></svg>
    2\u00A0h
  </span>
  <span style="display:flex;align-items:center;gap:8px">
    <svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="6" fill="var(--rust)"/></svg>
    4\u00A0h
  </span>
</div>
"""


def graph3_values() -> str:
    rows = []
    for k in [1, 2, 5, 10]:
        a, b, c = DAUER[k]
        cls5 = ' class="hi"' if k == 5 else ""
        cls10 = ' class="hi"' if k == 10 else ""
        # highlight ×5 4h and ×10 1.76h
        c5 = ' class="hi"' if k == 5 else ""
        a10 = ' class="hi"' if k == 10 else ""
        rows.append(
            f'<tr><th scope="row">\u00d7{k}</th>'
            f'<td{a10}>{minus(a,2)}</td>'
            f'<td>{minus(b,2)}</td>'
            f'<td{c5}>{minus(c,2)}</td></tr>'
        )
    return f"""
<table class="val num">
  <caption>Spitzensenkung, Platzhalter. Hervorgehoben: \u00d75 mit 4\u00A0h senkt die Spitze genauso stark wie \u00d710 mit 1,76\u00A0h – mit halb so viel Leistung.</caption>
  <thead>
    <tr><th scope="col">Stufe</th><th scope="col">1,76\u00A0h</th><th scope="col">2\u00A0h</th><th scope="col">4\u00A0h</th></tr>
  </thead>
  <tbody>
    {''.join(rows)}
  </tbody>
</table>
"""


def graph3_block(width: int, dark: bool, heading=True) -> str:
    top = ""
    if heading:
        top = f"""
<div class="sec-head">
  <p class="eb-text" style="margin:0">Kernantwort 3</p>
  <h2>Es fehlen Stunden, nicht Gigawatt.</h2>
  <p class="lead">Unbegrenzte Leistung ändert nichts. Der 4-Stunden-Punkt liegt an jeder Stufe deutlich höher \u2014 und \u00d75 mit 4\u00A0h senkt die Spitze genauso stark wie \u00d710 mit 1,76\u00A0h – mit halb so viel Leistung.</p>
</div>
"""
    return f"""
<section id="stunden" aria-labelledby="h-stunden">
  {top}
  {graph3_legend()}
  <figure>
    {graph3_svg(width, dark)}
    <figcaption class="disclaimer">national, kein Netzengpass, Vollvoraussicht \u00b7 Modell \u00b7 Beispielwerte</figcaption>
  </figure>
  {graph3_values()}
</section>
"""


# ---------------------------------------------------------------------------
# GRAPH 4 — Überschuss allein trägt nicht
# ---------------------------------------------------------------------------
def graph4_svg(width: int, dark: bool) -> str:
    wide = width >= 1000
    stages = [1, 2, 5, 10]
    if wide:
        W = width
        L, R = 70, 24
        T, B = 44, 20
        row_h = 72
        # two columns: pool | reduction
        pool_w = 420
        red_w = 280
        gap = 48
    else:
        W = width
        L, R = 40, 12
        T, B = 40, 16
        row_h = 80
        pool_w = 168
        red_w = 110
        gap = 16
    H = T + row_h * 5 + B  # 4 stages + comparison row at ×10 scale
    # actually 4 rows + a 5th comparison aligned under reduction col
    # 4 rows of data, 5th is "Spitze ×10 zum Vergleich"
    n_rows = 5
    H = T + row_h * n_rows + B

    uid = f"g4-{'w' if wide else 'n'}"
    parts = [svg_open(W, H,
                      "Aufnahme aus dem Oktober-Überschusspool und Spitzensenkung (Beispielwerte)",
                      "Der Balken Pool 134,2 Gigawattstunden ist bei mal 10 voll. "
                      "Die Spitze sinkt dabei nur um 7,91 Gigawatt, gegenüber 14,63 Gigawatt spitzenorientiert. "
                      "Alle Zahlen sind Platzhalter.",
                      uid)]

    pool_x = L
    red_x = L + pool_w + gap
    # headers
    parts.append(txt(pool_x, 16, "Pool 134,2\u00A0GWh", size=12, fill="var(--muted)", weight=500))
    parts.append(txt(pool_x + pool_w, 16, "134,2", size=12, fill="var(--muted)", anchor="end"))
    parts.append(txt(red_x, 16, "Spitze sinkt um", size=12, fill="var(--muted)", weight=500))
    # scale max for reduction: 16 GW (14.63 and 7.91 sit clearly)
    REDMAX = 16.0

    def pool_bar(y, frac, label, strong=False):
        # track
        parts.append(f'<rect x="{pool_x}" y="{y}" width="{pool_w}" height="16" fill="var(--linie)" rx="1"/>')
        fw = max(2, frac * pool_w)
        fill = "var(--ink)" if strong else "var(--ink)"
        parts.append(f'<rect x="{pool_x}" y="{y}" width="{fw:.1f}" height="16" fill="{fill}" rx="1"/>')
        # percent label
        pct = "voll" if frac >= 0.995 else f"{int(round(frac*100))}\u00A0%"
        # inside if bar wide enough
        if fw > 48:
            parts.append(txt(pool_x + fw - 6, y + 12.5, pct, size=12,
                             fill="var(--bg)", anchor="end", weight=500))
        else:
            parts.append(txt(pool_x + fw + 6, y + 12.5, pct, size=12,
                             fill="var(--ink)", anchor="start", weight=500))

    def red_bar(y, val, color="var(--ink)", label=None, hatch=False):
        bw = val / REDMAX * red_w
        parts.append(f'<rect x="{red_x}" y="{y}" width="{red_w}" height="16" fill="var(--linie)" rx="1"/>')
        if hatch:
            parts.append(
                f'<defs><pattern id="{uid}-rh" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
                f'<line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink)" stroke-width="1.1"/></pattern></defs>'
                if False else ""
            )
            parts.append(f'<rect x="{red_x}" y="{y}" width="{bw:.1f}" height="16" fill="var(--ink)" rx="1"/>')
        else:
            parts.append(f'<rect x="{red_x}" y="{y}" width="{bw:.1f}" height="16" fill="{color}" rx="1"/>')
        lab = label if label is not None else minus(val, 2 if val < 10 else 1)
        # number to the right of the used bar, or at end of track if tight
        tx = red_x + bw + 6
        # on 390, red_w is 110, number is ~70px ("−14,6 GW"). May overflow.
        # Put the number UNDER the bar on 390, to the right on 1280.
        return bw, lab, tx, y

    # 4 stage rows + 5th comparison
    # Row layout: label at left of pool? On 390 L=40, "×10" is 24px, so L includes the label.
    # I'll put ×k in the left margin (L starts after label). Wait, I set pool_x = L = 40.
    # Need ~36px for "×10". Reduce pool or put labels above each row on 390.

    # Redesign: label is LEFT of pool, part of L.
    lab_w = 36 if not wide else 56
    pool_x = L
    # actually L is left of everything. Label in [0+4, L), pool starts at L.
    # For "×10" 12px ~24px, L=40 is enough if we draw labels at x=L-8 anchor end.

    for i, k in enumerate(stages):
        cy = T + i * row_h
        bar_y = cy + (20 if not wide else 16)
        strong = k == 10
        # label
        parts.append(txt(pool_x - 8, bar_y + 12.5, f"\u00d7{k}", size=12,
                         fill="var(--ink)", anchor="end", weight=600 if strong else 500))
        if wide:
            parts.append(txt(pool_x - 8, bar_y + 26, GW_TICK[k] + "\u00A0GW", size=12,
                             fill="var(--muted)", anchor="end"))
        pool_bar(bar_y, POOL_PCT[k], None, strong=strong)
        bw, lab, tx, by = red_bar(bar_y, UE_SENK[k], color="var(--ink)")
        if wide:
            parts.append(txt(red_x + bw + 8, bar_y + 12.5, lab, size=12,
                             fill="var(--ink)", anchor="start", weight=500))
        else:
            # number under bar, left-aligned to red_x
            parts.append(txt(red_x, bar_y + 32, lab, size=12,
                             fill="var(--ink)", anchor="start", weight=500))

    # 5th row: Spitze ×10 comparison, only in the reduction column, same scale
    cy = T + 4 * row_h
    bar_y = cy + (12 if not wide else 16)
    # faint connector / label
    parts.append(txt(pool_x - 8, bar_y + 12.5, "", size=12))
    # A label in the pool column area: "Spitze \u00d710, zum Vergleich"
    parts.append(txt(pool_x, bar_y + 12.5, "Spitze \u00d710, zum Vergleich", size=12,
                     fill="var(--muted)", anchor="start", weight=500))
    bw, lab, tx, by = red_bar(bar_y, SP_SENK[10], color="var(--ink)")
    # make this bar visually different: outline / rust? Use ink, same fill, but it's longer — that's the point.
    # Wait, I already drew it via red_bar. For distinction, I'll redraw as a hollow / rust-outline? 
    # Actually I already appended a filled ink bar. Let me leave it ink, the length difference is the story.
    if wide:
        parts.append(txt(red_x + bw + 8, bar_y + 12.5, minus(SP_SENK[10], 2), size=12,
                         fill="var(--ink)", anchor="start", weight=500))
    else:
        parts.append(txt(red_x, bar_y + 32, minus(SP_SENK[10], 2), size=12,
                         fill="var(--ink)", anchor="start", weight=500))

    # Beispielwerte — top right
    parts.append(txt(W - R, 16, "Beispielwerte", size=12, fill="var(--muted)", anchor="end"))

    # On 390, "Spitze ×10, zum Vergleich" may collide with the 5th bar if it's long.
    # pool column is 168px starting at 40, red starts at 40+168+16=224, width 110.
    # The label is at pool_x=40, "Spitze ×10, zum Vergleich" ≈ 200px — OVERFLOWS into the bar!
    # Need a shorter / wrapped label on 390.
    # I'll handle this by rewriting the 5th row label after visual QA if needed.
    # For 390 use two lines.
    # Let me fix now: I already wrote a one-line. I'll replace by building more carefully.

    parts.append("</svg>")
    raw = "\n".join(p for p in parts if p)
    return raw


def graph4_svg_v2(width: int, dark: bool) -> str:
    """Cleaner G4: 4 pool rows, then a dedicated comparison unit at ×10."""
    wide = width >= 1000
    stages = [1, 2, 5, 10]
    if wide:
        W = width
        L, R = 72, 28
        T = 36
        row_h = 56
        pool_w = 520
        # reduction number sits to the right of pool, then a small reduction bar
        num_w = 100
        red_w = 240
        gap = 32
        B = 24
        extra = 100  # comparison block
    else:
        W = width
        L, R = 38, 10
        T = 32
        row_h = 52
        pool_w = 200
        num_w = 92
        red_w = 0  # numbers only on 390 in the row; comparison block below
        gap = 8
        B = 16
        extra = 148
    H = T + row_h * 4 + extra + B
    x_pool = L
    x_num = L + pool_w + gap
    x_red = x_num + num_w + (24 if wide else 0)
    REDMAX = 16.0

    uid = f"g4b-{'w' if wide else 'n'}"
    parts = [svg_open(W, H,
                      "Aufnahme aus dem Oktober-Überschusspool und Spitzensenkung (Beispielwerte)",
                      "Der Balken Pool 134,2 Gigawattstunden ist bei mal 10 voll. "
                      "Die Spitze sinkt dabei nur um 7,91 Gigawatt, gegenüber 14,63 Gigawatt spitzenorientiert. "
                      "Alle Zahlen sind Platzhalter.",
                      uid)]

    parts.append(txt(x_pool, 18, "Pool 134,2\u00A0GWh", size=12, fill="var(--muted)", weight=500))
    parts.append(txt(x_num, 18, "sinkt um", size=12, fill="var(--muted)", weight=500, anchor="start"))

    # 0 and 134,2 under header? A thin axis line above first bar
    parts.append(f'<line x1="{x_pool}" x2="{x_pool+pool_w}" y1="{T-4}" y2="{T-4}" stroke="var(--linie)" stroke-width="1"/>')

    for i, k in enumerate(stages):
        y = T + i * row_h
        by = y + 8
        frac = POOL_PCT[k]
        strong = k == 10
        # stage label
        parts.append(txt(x_pool - 8, by + 13, f"\u00d7{k}", size=12, fill="var(--ink)",
                         anchor="end", weight=600 if strong else 500))
        # track + fill
        bh = 18
        parts.append(f'<rect x="{x_pool}" y="{by}" width="{pool_w}" height="{bh}" fill="var(--linie)" rx="1"/>')
        fw = max(2.0, frac * pool_w)
        parts.append(f'<rect x="{x_pool}" y="{by}" width="{fw:.1f}" height="{bh}" fill="var(--ink)" rx="1"/>')
        pct = "voll" if frac >= 0.995 else f"{int(round(frac*100))}\u00A0%"
        if fw > 56:
            # text in bar, contrast: ink fill, text in --bg. 
            # --bg on --ink: light #F6F6F3 on #101214 ≈ 17:1; dark #0B0D0F on #E9EEF2 wait fill is ink which is #E9EEF2 on dark, text --bg #0B0D0F ≈ 16:1
            parts.append(txt(x_pool + fw - 6, by + 13.5, pct, size=12, fill="var(--bg)", anchor="end", weight=500))
        else:
            parts.append(txt(x_pool + fw + 6, by + 13.5, pct, size=12, fill="var(--ink)", anchor="start", weight=500))
        # reduction number
        parts.append(txt(x_num, by + 13.5, minus(UE_SENK[k], 2), size=12, fill="var(--ink)",
                         anchor="start", weight=600 if strong else 500))
        if wide:
            # small reduction bar
            rw = UE_SENK[k] / REDMAX * red_w
            parts.append(f'<rect x="{x_red}" y="{by+2}" width="{red_w}" height="14" fill="var(--linie)" rx="1"/>')
            parts.append(f'<rect x="{x_red}" y="{by+2}" width="{rw:.1f}" height="14" fill="var(--ink)" rx="1"/>')

    # comparison block
    cy = T + 4 * row_h + 10
    parts.append(f'<line x1="{L-4}" x2="{W-R}" y1="{cy-8}" y2="{cy-8}" stroke="var(--linie)" stroke-width="1"/>')
    parts.append(txt(L if wide else L, cy + 8, "Bei \u00d710, zum Vergleich", size=12, fill="var(--muted)", weight=500))

    # two bars, same scale 0–16 GW, full width available
    if wide:
        cmp_x = L
        cmp_w = 520
        cmp_num = L + cmp_w + 32
    else:
        cmp_x = L
        cmp_w = W - L - R - 96
        cmp_num = cmp_x + cmp_w + 8

    def cmp_row(y, val, label, fill, weight=500):
        parts.append(txt(cmp_x, y - 4, label, size=12, fill="var(--muted)"))
        parts.append(f'<rect x="{cmp_x}" y="{y}" width="{cmp_w}" height="16" fill="var(--linie)" rx="1"/>')
        bw = val / REDMAX * cmp_w
        parts.append(f'<rect x="{cmp_x}" y="{y}" width="{bw:.1f}" height="16" fill="{fill}" rx="1"/>')
        parts.append(txt(cmp_num, y + 13, minus(val, 2), size=12, fill="var(--ink)", weight=weight))

    cmp_row(cy + 28, UE_SENK[10], "Überschuss", "var(--muted)", 500)
    cmp_row(cy + 72 if not wide else cy + 64, SP_SENK[10], "dieselbe Flotte, spitzenorientiert", "var(--ink)", 500)

    parts.append("</svg>")
    return "\n".join(parts)


def graph4_block(width: int, dark: bool, heading=True) -> str:
    top = ""
    if heading:
        top = f"""
<div class="sec-head">
  <p class="eb-text" style="margin:0">Kernantwort 4</p>
  <h2>Überschuss allein trägt nicht.</h2>
  <p class="lead">\u00d710 nimmt den ganzen Oktober-Pool auf. Die Spitze sinkt trotzdem nur etwa halb so weit wie mit derselben Flotte spitzenorientiert.</p>
</div>
"""
    return f"""
<section id="ueberschuss" aria-labelledby="h-ueber">
  {top}
  <figure>
    {graph4_svg_v2(width, dark)}
    <figcaption class="disclaimer">national, kein Netzengpass, Vollvoraussicht \u00b7 Modell \u00b7 Beispielwerte</figcaption>
  </figure>
</section>
"""


# ---------------------------------------------------------------------------
# PAGE chrome
# ---------------------------------------------------------------------------
def nav(width: int) -> str:
    inner_cls = "wrap"
    return f"""
<header class="nav">
  <div class="{inner_cls} nav-inner" style="display:flex;justify-content:space-between;align-items:center;height:56px;">
    <b>SpeicherPilot</b>
    <span class="page">Monat</span>
  </div>
</header>
"""


def footer() -> str:
    return """
<footer class="site">
  <p>Quelle: Energy-Charts, battery-charts \u00b7 Oktober 2026 \u00b7 Modell, Vollvoraussicht.</p>
  <p>Zahlen in diesem Vorentwurf sind Platzhalter. Die \u00d7k-Konvention ist auf Variante (a) festgelegt (\u00d7k = k-mal die heutige Flotte, \u00d71 = Ist-Zustand); die Werte werden vor dem Bau neu gerechnet.</p>
  <p>Illustratives Modell, keine Beschaffungs- oder Anlagenberatung. National, kein Netzengpass.</p>
</footer>
"""


def page_intro(width: int) -> str:
    return """
<div class="eyebrow">
  <span class="eb-text">Monatshorizont \u00b7 Oktober 2026</span>
  <span class="chip chip-model">Modell</span>
  <span class="chip chip-ph">Beispielwerte</span>
</div>
<p class="ph-banner">Vorentwurf \u00b7 Zahlen sind Platzhalter und werden neu gerechnet.</p>
"""


def html_page(kind: str, width: int, dark: bool) -> str:
    theme = "dark" if dark else "light"
    body_cls = f"w{width} {'dark' if dark else ''}"
    if kind == "page":
        body_cls += " page"
        inner_w = width - (40 if width == 390 else 128)
        content = f"""
{nav(width)}
<div class="wrap">
  {page_intro(width)}
  {graph1_block(inner_w, dark, heading=True)}
  <div class="section">
    {graph3_block(inner_w, dark, heading=True)}
  </div>
  <div class="section">
    {graph4_block(inner_w, dark, heading=True)}
  </div>
  {footer()}
</div>
"""
    elif kind.startswith("g"):
        body_cls += " isolate"
        inner_w = width - (40 if width == 390 else 128)
        if kind == "g1":
            block = graph1_block(inner_w, dark, heading=True)
        elif kind == "g3":
            block = graph3_block(inner_w, dark, heading=True)
        else:
            block = graph4_block(inner_w, dark, heading=True)
        content = f"""
<div class="wrap">
  <p class="eb-text" style="margin:0">SpeicherPilot /monat \u00b7 Vorentwurf</p>
  {block}
</div>
"""
    elif kind == "uebersicht":
        body_cls = "w1280 uebersicht" + (" dark" if dark else "")
        inner_w = 1280 - 128
        content = f"""
<div class="wrap">
  <div class="uv-head">
    <p class="eb-text">SpeicherPilot /monat \u00b7 Vorentwurf v1 \u00b7 12.11.2026</p>
    <h1 style="font-size:var(--type-32);max-width:30ch;margin-top:12px">Drei Graphen, drei Kernantworten.</h1>
    <p class="lead">Zahlen sind Platzhalter. Schrift Space Grotesk / JetBrains Mono, Rost nur #B4532A. Linear, kein Tooltip, Werte fest darunter.</p>
  </div>
  {graph1_block(inner_w, dark, heading=True)}
  <div class="section">{graph3_block(inner_w, dark, heading=True)}</div>
  <div class="section">{graph4_block(inner_w, dark, heading=True)}</div>
  <footer class="site">
    <p>Empfehlung an den Bau: dieser Aufbau, mit der Marktlinie erst ab \u00d73 schraffiert. Vor dem Bau neu rechnen (Konvention a, Basis 4,64/8,15).</p>
  </footer>
</div>
"""
    else:
        raise ValueError(kind)

    title = {
        "page": "SpeicherPilot /monat · Vorentwurf",
        "g1": "Hero · höchste Restlast · Vorentwurf",
        "g3": "Stunden, nicht Gigawatt · Vorentwurf",
        "g4": "Überschuss allein trägt nicht · Vorentwurf",
        "uebersicht": "Übersicht · /monat Vorentwurf",
    }[kind]
    return f"""<!DOCTYPE html>
<html lang="de" class="{'dark' if dark else ''}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width={width}"/>
<title>{title}</title>
<style>{css()}</style>
</head>
<body class="{body_cls}" style="width:{1280 if kind=='uebersicht' else width}px">
{content}
</body>
</html>
"""


def main():
    jobs = []
    # full pages
    for w in (390, 1280):
        for dark in (False, True):
            theme = "dark" if dark else "light"
            name = f"seite_{w}_{theme}.html"
            (OUT / name).write_text(html_page("page", w, dark), encoding="utf-8")
            jobs.append(name)
            for g in ("g1", "g3", "g4"):
                name = f"{g}_{w}_{theme}.html"
                (OUT / name).write_text(html_page(g, w, dark), encoding="utf-8")
                jobs.append(name)
    name = "uebersicht.html"
    (OUT / name).write_text(html_page("uebersicht", 1280, False), encoding="utf-8")
    jobs.append(name)
    print("wrote", len(jobs), "files")
    for n in jobs:
        print(" ", n)


if __name__ == "__main__":
    main()
