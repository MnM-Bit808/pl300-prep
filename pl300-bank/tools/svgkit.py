"""Draws Power BI-style exhibits as standalone SVG files for the PL-300 question bank."""
from xml.sax.saxutils import escape as _e

FONT = "Segoe UI, 'IBM Plex Sans', Arial, sans-serif"
MONO = "Consolas, 'IBM Plex Mono', monospace"
INK, INK2, LINE, CANVAS, PANEL = "#252423", "#605E5C", "#C8C6C4", "#EDEBE9", "#FFFFFF"
PINK, GREEN, BLUE, AMBER = "#F7D9EC", "#D4EEDD", "#DCEBFA", "#FFF4CE"
PBI = ["#118DFF", "#12239E", "#E66C37", "#6B007B", "#E044A7", "#744EC2", "#D9B300", "#D64550", "#197278"]


def e(s):
    return _e(str(s))


def text(x, y, s, size=13, fill=INK, weight=400, anchor="start", family=FONT, italic=False):
    st = ' font-style="italic"' if italic else ''
    return (f'<text x="{x}" y="{y}" font-family="{family}" font-size="{size}" fill="{fill}" '
            f'font-weight="{weight}" text-anchor="{anchor}"{st}>{e(s)}</text>')


def rect(x, y, w, h, fill=PANEL, stroke=LINE, rx=0, sw=1, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ''
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>'


def line(x1, y1, x2, y2, stroke=INK2, sw=1.5, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ''
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{sw}"{d}/>'


def wrap(w, h, body, title, bg=CANVAS):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
            f'role="img" aria-label="{e(title)}"><title>{e(title)}</title>'
            f'{rect(0.5, 0.5, w - 1, h - 1, bg, LINE, 4)}{body}</svg>')


def table_icon(x, y):
    return (f'<g transform="translate({x},{y})"><rect x="1" y="2" width="12" height="10" rx="1" fill="none" '
            f'stroke="{INK2}"/><path d="M1 5.5H13M5 5.5V12" stroke="{INK2}"/></g>')


# ---------- Model view ----------
def model(w, h, tables, rels, title, legend=None):
    """tables: name -> {x, y, w, fields: [(label, kind, hl)], tag}
       kind: '' | 'sum' | 'calc' | 'date' | 'hier'; hl: None | 'pink' | 'green' | 'blue'
       rels: [{pts: [(x,y), ...] straight segments, ends: ('1','*'), dir: '>'|'<'|'<>'|None, dash: bool}]
       dir '>' means the filter flows from the first point towards the last."""
    out = []
    for r in rels:
        pts = r["pts"]
        for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
            out.append(line(x1, y1, x2, y2, dash="5 4" if r.get("dash") else None))
        la, lb = r.get("ends", ("", ""))

        def endlab(px, py, nx, ny, lab):
            dx, dy = nx - px, ny - py
            if dx:
                lx, ly = px + (10 if dx > 0 else -10), py - 7
            else:
                lx, ly = px + 10, py + (16 if dy > 0 else -6)
            return text(lx, ly, lab, 14 if lab == "*" else 12, INK, 400, "middle")
        if la:
            out.append(endlab(*pts[0], *pts[1], la))
        if lb:
            out.append(endlab(*pts[-1], *pts[-2], lb))
        if r.get("dir"):
            segs = list(zip(pts, pts[1:]))
            (x1, y1), (x2, y2) = max(segs, key=lambda s: abs(s[0][0] - s[1][0]) + abs(s[0][1] - s[1][1]))
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            horiz = y1 == y2
            out.append(rect(mx - 8, my - 8, 16, 16, PANEL, INK2, 2))
            d = r["dir"]
            if d == "<>":
                pth = (f"M{mx-6} {my} L{mx-1} {my-4} L{mx-1} {my+4}Z M{mx+6} {my} L{mx+1} {my-4} L{mx+1} {my+4}Z" if horiz else
                       f"M{mx} {my-6} L{mx-4} {my-1} L{mx+4} {my-1}Z M{mx} {my+6} L{mx-4} {my+1} L{mx+4} {my+1}Z")
            else:
                fwd = (x2 > x1) or (y2 > y1)
                pos = fwd == (d == ">")
                if horiz:
                    pth = (f"M{mx-3} {my-4} L{mx+3} {my} L{mx-3} {my+4}Z" if pos else
                           f"M{mx+3} {my-4} L{mx-3} {my} L{mx+3} {my+4}Z")
                else:
                    pth = (f"M{mx-4} {my-3} L{mx} {my+3} L{mx+4} {my-3}Z" if pos else
                           f"M{mx-4} {my+3} L{mx} {my-3} L{mx+4} {my+3}Z")
            out.append(f'<path d="{pth}" fill="{INK}"/>')
    for name, t in tables.items():
        x, y, tw = t["x"], t["y"], t.get("w", 200)
        fh = 26
        bh = 12 + fh * len(t["fields"])
        out.append(rect(x, y, tw, 36 + bh, PANEL, LINE, 4))
        out.append(line(x, y + 36, x + tw, y + 36, "#E1DFDD", 1))
        out.append(table_icon(x + 10, y + 11))
        out.append(text(x + 32, y + 23, name, 14, INK, 600))
        if t.get("tag"):
            tg = t["tag"]
            tw2 = 12 + 7 * len(tg)
            out.append(rect(x + tw - tw2 - 8, y + 9, tw2, 18, AMBER, "#E1C66B", 9))
            out.append(text(x + tw - tw2 / 2 - 8, y + 22, tg, 11, INK, 500, "middle"))
        for i, (lab, kind, hl) in enumerate(t["fields"]):
            fy = y + 42 + i * fh
            if hl:
                out.append(rect(x + 1, fy, tw - 2, fh, {"pink": PINK, "green": GREEN, "blue": BLUE}[hl], "none", 0, 0))
            icon = {"sum": "Σ", "calc": "▦", "date": "▣", "hier": "⋔"}.get(kind, "")
            if icon:
                out.append(text(x + 16, fy + 18, icon, 13, INK2, 400, "middle"))
            out.append(text(x + 30, fy + 18, lab, 13, "#323130"))
    if legend:
        out.append(text(16, h - 14, legend, 12, "#484644"))
    return wrap(w, h, "".join(out), title)


# ---------- Power Query preview ----------
TYPE_ICON = {"text": "ABC", "int": "1²3", "dec": "1.2", "date": "▦", "dt": "◷", "any": "ABC123",
             "bin": "▤", "rec": "▭", "tbl": "⊞", "list": "≡", "bool": "✓✗", "cur": "$"}


def pq(cols, rows, title, steps=None, banner=None, formula=None, profile=None, row_h=26, col_w=None,
       highlight_step=None, query_name=None, footer=None):
    """cols: [(name, type)]; rows: [[values]]; steps: applied step names;
       profile: per column (valid, error, empty, 'x distinct, y unique') or None; banner: ('error'|'warn', text)"""
    n = len(cols)
    if col_w is None:
        cw = [max(110, 8 * max(len(c[0]) + 6, *(len(str(r[i])) + 2 for r in rows))) for i, c in enumerate(cols)]
    elif isinstance(col_w, int):
        cw = [col_w] * n
    else:
        cw = col_w
    left = 16
    gx = left + 34
    grid_w = 34 + sum(cw)
    side = 220 if steps else 0
    W = left + grid_w + (16 + side if steps else 0) + 16
    y = 14
    out = []
    if query_name:
        out.append(text(left, y + 12, f"Query: {query_name}", 12, INK2, 600))
        y += 24
    if formula:
        out.append(rect(left, y, grid_w, 30, PANEL, LINE, 2))
        out.append(text(left + 10, y + 20, "fx", 13, INK2, 600, italic=True))
        out.append(text(left + 34, y + 20, formula, 13, INK, 400, family=MONO))
        y += 42
    if banner:
        kind, msg = banner
        err = kind == "error"
        out.append(rect(left, y, grid_w, 34, "#FDE7E9" if err else AMBER, "#E8C9CB" if err else "#F3D99A", 2))
        out.append(text(left + 12, y + 22, ("✕ " if err else "⚠ ") + msg, 13, "#A4262C" if err else "#6B4E00"))
        y += 44
    top = y
    body_h = 30 + (64 if profile else 0) + row_h * len(rows)
    out.append(rect(left, top, grid_w, body_h, PANEL, LINE, 2))
    out.append(rect(left, top, grid_w, 30, "#F3F2F1", LINE, 2))
    x = gx
    for i, (name, typ) in enumerate(cols):
        out.append(line(x, top, x, top + body_h, "#E1DFDD", 1))
        ic = TYPE_ICON.get(typ, typ)
        out.append(text(x + 8, top + 20, ic, 10, INK2, 600))
        out.append(text(x + 14 + 7 * len(ic), top + 20, name, 13, INK, 600))
        x += cw[i]
    ry = top + 30
    if profile:
        x = gx
        for i, p in enumerate(profile):
            if p:
                v, er, em, dist = p
                bw = cw[i] - 16
                out.append(rect(x + 8, ry + 8, bw, 5, "#E1DFDD", "none", 0, 0))
                out.append(rect(x + 8, ry + 8, bw * v / 100, 5, "#1AA88A", "none", 0, 0))
                if er:
                    out.append(rect(x + 8 + bw * v / 100, ry + 8, bw * er / 100, 5, "#D13438", "none", 0, 0))
                out.append(text(x + 8, ry + 30, f"Valid {v}%  Error {er}%  Empty {em}%", 10, INK2))
                out.append(text(x + 8, ry + 50, dist, 10, INK2))
            x += cw[i]
        out.append(line(left, ry + 64, left + grid_w, ry + 64, "#E1DFDD", 1))
        ry += 64
    for r_i, r in enumerate(rows):
        out.append(text(left + 17, ry + 18, r_i + 1, 12, INK2, 400, "middle"))
        x = gx
        for i, val in enumerate(r):
            typ = cols[i][1]
            s = str(val)
            if s == "Error":
                out.append(text(x + 8, ry + 18, s, 13, "#A4262C", 600))
            elif s == "null":
                out.append(text(x + cw[i] - 8 if typ in ("int", "dec", "cur", "date", "dt") else x + 8, ry + 18, s, 13,
                                INK2, 400, "end" if typ in ("int", "dec", "cur", "date", "dt") else "start", italic=True))
            elif s in ("Table", "Record", "List", "Binary"):
                out.append(text(x + 8, ry + 18, s, 13, "#0F6CBD", 600))
            else:
                right = typ in ("int", "dec", "cur", "date", "dt")
                out.append(text(x + cw[i] - 8 if right else x + 8, ry + 18, s, 13, INK, 400, "end" if right else "start"))
            x += cw[i]
        if r_i < len(rows) - 1:
            out.append(line(left, ry + row_h, left + grid_w, ry + row_h, "#F3F2F1", 1))
        ry += row_h
    H = top + body_h + 16
    if footer:
        out.append(text(left, H + 4, footer, 12, INK2))
        H += 22
    if steps:
        sx = left + grid_w + 16
        sh = 44 + 26 * len(steps)
        out.append(rect(sx, top, side, sh, PANEL, LINE, 2))
        out.append(text(sx + 12, top + 24, "Applied steps", 12, INK2, 600))
        sel = highlight_step if highlight_step is not None else len(steps) - 1
        for i, s in enumerate(steps):
            yy = top + 36 + i * 26
            if i == sel:
                out.append(rect(sx + 4, yy, side - 8, 24, "#E1EFFA", "none", 2, 0))
            out.append(text(sx + 14, yy + 17, s, 13, INK))
            out.append(text(sx + side - 14, yy + 17, "⚙", 11, INK2, 400, "end"))
        H = max(H, top + sh + 16)
    return wrap(W, H, "".join(out), title, "#FAF9F8")


# ---------- Dialogs ----------
def dialog(w, title, rows, caption, buttons=("OK", "Cancel")):
    """rows: ('label', name, value) | ('radio', name, [opts], selected) | ('list', [items], selected)
             | ('note', text) | ('check', label, bool) | ('heading', text) | ('buttons_inline', [labels])
             | ('table', [headers], [[cells]], selected_row)"""
    out = [text(24, 38, title, 18, INK, 600)]
    y = 66
    for r in rows:
        k = r[0]
        if k == "heading":
            y += 8
            out.append(text(24, y + 4, r[1], 14, INK, 600))
            y += 22
        elif k == "label":
            out.append(text(24, y + 4, r[1], 13, INK, 600))
            y += 14
            out.append(rect(24, y, w - 48, 30, PANEL, "#8A8886", 2))
            out.append(text(34, y + 20, r[2], 13, INK))
            y += 46
        elif k == "radio":
            out.append(text(24, y + 4, r[1], 13, INK, 600))
            y += 16
            for i, o in enumerate(r[2]):
                out.append(f'<circle cx="32" cy="{y+9}" r="7" fill="#fff" stroke="{INK2}"/>')
                if i == r[3]:
                    out.append(f'<circle cx="32" cy="{y+9}" r="4" fill="#0F6CBD"/>')
                out.append(text(46, y + 14, o, 13, INK))
                y += 24
            y += 10
        elif k == "list":
            lh = 26 * len(r[1]) + 8
            out.append(rect(24, y, w - 48, lh, PANEL, "#8A8886", 2))
            for i, it in enumerate(r[1]):
                if i == r[2]:
                    out.append(rect(26, y + 4 + 26 * i, w - 52, 26, "#E1EFFA", "none", 0, 0))
                out.append(text(36, y + 22 + 26 * i, it, 13, INK))
            y += lh + 14
        elif k == "table":
            heads, cells, sel = r[1], r[2], r[3]
            colw = (w - 48) / len(heads)
            lh = 30 + 28 * len(cells)
            out.append(rect(24, y, w - 48, lh, PANEL, "#8A8886", 2))
            for j, hd in enumerate(heads):
                out.append(text(34 + j * colw, y + 20, hd, 12, INK2, 600))
            for i, row in enumerate(cells):
                yy = y + 30 + 28 * i
                if i == sel:
                    out.append(rect(26, yy, w - 52, 28, "#E1EFFA", "none", 0, 0))
                for j, c in enumerate(row):
                    out.append(text(34 + j * colw, yy + 19, c, 13, INK))
            y += lh + 14
        elif k == "note":
            out.append(text(24, y + 4, r[1], 12, INK2))
            y += 22
        elif k == "check":
            out.append(rect(24, y, 16, 16, "#0F6CBD" if r[2] else PANEL, "#8A8886", 2))
            if r[2]:
                out.append(f'<path d="M27 {y+8} L31 {y+12} L37 {y+4}" stroke="#fff" stroke-width="2" fill="none"/>')
            out.append(text(48, y + 13, r[1], 13, INK))
            y += 28
        elif k == "buttons_inline":
            bx = 24
            for b in r[1]:
                bw = 20 + 7.5 * len(b)
                out.append(rect(bx, y, bw, 30, PANEL, "#8A8886", 2))
                out.append(text(bx + bw / 2, y + 20, b, 13, INK, 400, "middle"))
                bx += bw + 8
            y += 44
    bx = w - 24
    for i, b in enumerate(buttons):
        bw = max(88, 28 + 7.5 * len(b))
        bx -= bw
        primary = i == 0
        out.append(rect(bx, y + 6, bw, 32, "#0F6CBD" if primary else PANEL, "#0F6CBD" if primary else "#8A8886", 3))
        out.append(text(bx + bw / 2, y + 27, b, 13, "#fff" if primary else INK, 600 if primary else 400, "middle"))
        bx -= 8
    return wrap(w, y + 56, "".join(out), caption, PANEL)


# ---------- Report visual showing an error ----------
def visual_error(w, h, vtitle, msg_lines, caption):
    out = [rect(20, 20, w - 40, h - 40, PANEL, "#D2D0CE", 0), text(36, 46, vtitle, 14, INK, 600)]
    cx = w / 2
    out.append(f'<circle cx="{cx}" cy="{h/2-24}" r="16" fill="none" stroke="#A4262C" stroke-width="2"/>')
    out.append(text(cx, h / 2 - 17, "!", 18, "#A4262C", 700, "middle"))
    for i, m in enumerate(msg_lines):
        out.append(text(cx, h / 2 + 20 + i * 20, m, 14 if i == 0 else 13, INK if i == 0 else INK2, 600 if i == 0 else 400, "middle"))
    return wrap(w, h, "".join(out), caption, "#E9E7E5")


# ---------- Column profile (statistics + value distribution) ----------
def colprofile(col, typ, stats, dist, caption, group_by=None, footer="Column profiling based on top 1000 rows"):
    """stats: [(label, value)]; dist: [(label, count)] drawn as vertical bars."""
    W = 900
    out = [text(16, 30, f"Column profile: {col}", 14, INK, 600),
           text(16 + 8 * (len(col) + 17), 30, TYPE_ICON.get(typ, typ), 11, INK2, 600)]
    # statistics panel
    sh = 44 + 24 * len(stats)
    out.append(rect(16, 44, 280, sh, PANEL, LINE, 2))
    out.append(text(28, 68, "Column statistics", 13, INK, 600))
    for i, (k, v) in enumerate(stats):
        yy = 92 + 24 * i
        out.append(text(28, yy, k, 13, INK))
        out.append(text(284, yy, v, 13, INK, 400, "end"))
    # distribution panel
    dx, dw = 312, W - 312 - 16
    dh = max(sh, 260)
    out.append(rect(dx, 44, dw, dh, PANEL, LINE, 2))
    out.append(text(dx + 12, 68, "Value distribution", 13, INK, 600))
    if group_by:
        out.append(text(dx + dw - 12, 68, f"Group by: {group_by}", 12, INK2, 400, "end"))
    mx = max(c for _, c in dist) or 1
    n = len(dist)
    slot = (dw - 40) / n
    bw = min(44, slot * 0.7)
    base = 44 + dh - 46
    top = 92
    for i, (lab, c) in enumerate(dist):
        bx = dx + 20 + i * slot + (slot - bw) / 2
        bh = (base - top) * c / mx
        out.append(rect(bx, base - bh, bw, bh, "#118DFF", "none", 0, 0))
        out.append(text(bx + bw / 2, base - bh - 6, f"{c:,}", 11, INK2, 400, "middle"))
        out.append(text(bx + bw / 2, base + 18, lab, 11, INK, 400, "middle"))
    H = 44 + dh + 16
    if footer:
        out.append(text(16, H + 6, footer, 12, INK2))
        H += 24
    return wrap(W, H, "".join(out), caption, "#FAF9F8")


# ---------- Power Query error display ----------
def error_pane(formula, err, message, details, caption, steps=None, highlight_step=None):
    W = 1000 if steps else 780
    gw = 780 - 32
    out = []
    out.append(rect(16, 14, gw, 30, PANEL, LINE, 2))
    out.append(text(26, 34, "fx", 13, INK2, 600, italic=True))
    out.append(text(50, 34, formula, 11.5, INK, 400, family=MONO))
    bh = 70 + 22 * len(details)
    out.append(rect(16, 58, gw, bh, "#FFF8E6", "#F3D99A", 2))
    out.append(text(32, 86, "⚠", 18, "#8A6100"))
    out.append(text(58, 86, f"{err}: {message}", 13.5, INK, 600))
    out.append(text(58, 112, "Details:", 13, INK2, 600))
    for i, d in enumerate(details):
        out.append(text(76, 134 + 22 * i, d, 13, INK, 400, family=MONO))
    H = 58 + bh + 16
    if steps:
        sx = 780
        sh = 44 + 26 * len(steps)
        out.append(rect(sx, 14, 204, sh, PANEL, LINE, 2))
        out.append(text(sx + 12, 38, "Applied steps", 12, INK2, 600))
        sel = highlight_step if highlight_step is not None else len(steps) - 1
        for i, st in enumerate(steps):
            yy = 50 + i * 26
            if i == sel:
                out.append(rect(sx + 4, yy, 196, 24, "#E1EFFA", "none", 2, 0))
            out.append(text(sx + 14, yy + 17, st, 13, INK))
            if i == sel:
                out.append(text(sx + 190, yy + 17, "⚠", 12, "#8A6100", 400, "end"))
        H = max(H, 14 + sh + 16)
    return wrap(W, H, "".join(out), caption, "#FAF9F8")


# ---------- Merge dialog ----------
def _grid(x, y, cols, rows, hl=None, cw=120):
    out = []
    w = cw * len(cols)
    out.append(rect(x, y, w, 26 + 24 * len(rows), PANEL, LINE, 2))
    out.append(rect(x, y, w, 26, "#F3F2F1", LINE, 2))
    for j, (c, t) in enumerate(cols):
        cx = x + j * cw
        if hl is not None and j in (hl if isinstance(hl, (list, tuple)) else [hl]):
            out.append(rect(cx + 1, y + 1, cw - 2, 26 + 24 * len(rows) - 2, "#DCEBFA", "none", 0, 0))
        if j:
            out.append(line(cx, y, cx, y + 26 + 24 * len(rows), "#E1DFDD", 1))
        ic = TYPE_ICON.get(t, t)
        out.append(text(cx + 6, y + 17, ic, 9.5, INK2, 600))
        out.append(text(cx + 12 + 6.8 * len(ic), y + 17, c, 12, INK, 600))
    for i, r in enumerate(rows):
        for j, v in enumerate(r):
            s = str(v)
            col = "#0F6CBD" if s in ("Table", "Record", "List") else (INK2 if s == "null" else INK)
            out.append(text(x + j * cw + 8, y + 43 + 24 * i, s, 12, col, 400, italic=(s == "null")))
    return "".join(out), 26 + 24 * len(rows)


def merge_dialog(left, right, join_kind, note, caption, fuzzy=False, cw=130):
    """left/right: (name, cols, rows, key_index or [indexes])"""
    W = 40 + cw * max(len(left[1]), len(right[1]))
    W = max(W, 760)
    out = [text(20, 36, "Merge", 18, INK, 600),
           text(20, 60, "Select a table and matching columns to create a merged table.", 12.5, INK2)]
    y = 80
    for k, (name, cols, rows, key) in enumerate((left, right)):
        out.append(rect(20, y, 320, 28, PANEL, "#8A8886", 2))
        out.append(text(30, y + 19, name, 13, INK, 600))
        out.append(text(330, y + 19, "▾", 12, INK2, 400, "end"))
        g, gh = _grid(20, y + 38, cols, rows, key, cw)
        out.append(g)
        y += 38 + gh + 20
    out.append(text(20, y + 4, "Join Kind", 13, INK, 600))
    out.append(rect(20, y + 12, 320, 28, PANEL, "#8A8886", 2))
    out.append(text(30, y + 31, join_kind, 13, INK))
    out.append(text(330, y + 31, "▾", 12, INK2, 400, "end"))
    out.append(rect(370, y + 18, 16, 16, "#0F6CBD" if fuzzy else PANEL, "#8A8886", 2))
    if fuzzy:
        out.append(f'<path d="M373 {y+26} L377 {y+30} L383 {y+22}" stroke="#fff" stroke-width="2" fill="none"/>')
    out.append(text(394, y + 31, "Use fuzzy matching to perform the merge", 13, INK))
    y += 56
    ok = not note.startswith("!")
    msg = note.lstrip("!")
    out.append(text(20, y + 8, ("✓ " if ok else "⚠ ") + msg, 13, "#107C10" if ok else "#8A6100", 600))
    y += 24
    bx = W - 20
    for i, b in enumerate(("OK", "Cancel")):
        bw = 88
        bx -= bw
        out.append(rect(bx, y + 6, bw, 32, "#0F6CBD" if i == 0 else PANEL, "#0F6CBD" if i == 0 else "#8A8886", 3))
        out.append(text(bx + bw / 2, y + 27, b, 13, "#fff" if i == 0 else INK, 600 if i == 0 else 400, "middle"))
        bx -= 8
    return wrap(W, y + 56, "".join(out), caption, PANEL)


# ---------- Query dependencies view ----------
def deps(nodes, edges, caption, w=900, h=420, legend=None):
    """nodes: name -> (x, y, w, label_lines, style) style: 'source'|'query'|'staging'; edges: [(a, b)] drawn a -> b"""
    out = []
    def mid(n, side):
        x, y, nw, _, _ = nodes[n]
        nh = 64
        return {"r": (x + nw, y + nh / 2), "l": (x, y + nh / 2), "b": (x + nw / 2, y + nh), "t": (x + nw / 2, y)}[side]
    for a, b in edges:
        ax, ay = mid(a, "r")
        bx, by = mid(b, "l")
        mx = (ax + bx) / 2
        out.append(f'<path d="M{ax} {ay} L{mx} {ay} L{mx} {by} L{bx-6} {by}" fill="none" stroke="{INK2}" stroke-width="1.5"/>')
        out.append(f'<path d="M{bx-7} {by-5} L{bx} {by} L{bx-7} {by+5}Z" fill="{INK2}"/>')
    for n, (x, y, nw, lines, style) in nodes.items():
        fill = {"source": "#F3F2F1", "query": PANEL, "staging": PANEL}[style]
        out.append(rect(x, y, nw, 64, fill, INK2 if style != "staging" else "#8A8886", 4, 1, "5 4" if style == "staging" else None))
        out.append(text(x + 12, y + 24, n, 13.5, INK, 600))
        for i, l in enumerate(lines):
            out.append(text(x + 12, y + 41 + 14 * i, l, 11.5, INK2, 400, italic=(style == "staging")))
    if legend:
        out.append(text(16, h - 14, legend, 12, "#484644"))
    return wrap(w, h, "".join(out), caption, "#FAF9F8")


# ---------- Report: matrix / table visual ----------
def matrix(vtitle, headers, rows, caption, w=640, col_w=None, q_col=None, wells=None, note=None):
    """rows: list of (label, [values], level, bold). level indents label. q_col: index of a value column to shade with '?'.
       wells: optional [(well name, [fields])] drawn as a Build pane on the right."""
    pane = 230 if wells else 0
    vw = w - pane
    out = []
    ncol = len(headers)
    cw = col_w or [max(140, (vw - 80) // ncol)] * ncol
    gx = 36
    tw = sum(cw)
    vh = 92 + 26 * len(rows)
    H = max(vh + 40, 40 + (sum(40 + 30 * len(f) for _, f in wells) + 50 if wells else 0))
    out.append(rect(20, 20, vw - 40 + 0, H - 40, PANEL, "#D2D0CE", 0))
    out.append(text(gx, 48, vtitle, 14, INK, 600))
    y = 66
    x = gx
    for j, hd in enumerate(headers):
        anchor = "start" if j == 0 else "end"
        tx = x + 6 if j == 0 else x + cw[j] - 8
        if q_col is not None and j == q_col:
            out.append(rect(x, y, cw[j], 26 + 26 * len(rows), PINK, "none", 0, 0))
        out.append(text(tx, y + 18, hd, 13, INK, 600, anchor))
        x += cw[j]
    out.append(line(gx, y + 26, gx + tw, y + 26, "#8A8886", 1))
    for i, (lab, vals, lvl, bold) in enumerate(rows):
        yy = y + 26 + 26 * i
        if i % 2 == 1:
            out.append(rect(gx, yy, tw, 26, "#F3F2F1" if not (q_col is not None) else "#F3F2F1", "none", 0, 0))
            if q_col is not None:
                out.append(rect(gx + sum(cw[:q_col]), yy, cw[q_col], 26, "#F2CFE4", "none", 0, 0))
        out.append(text(gx + 6 + 18 * lvl, yy + 18, lab, 13, INK, 600 if bold else 400))
        x = gx + cw[0]
        for j, v in enumerate(vals, start=1):
            if v is not None:
                out.append(text(x + cw[j] - 8, yy + 18, v, 13, INK, 600 if bold else 400, "end"))
            elif q_col is not None and j == q_col:
                out.append(text(x + cw[j] - 8, yy + 19, "?", 17, "#B4237A", 700, "end"))
            x += cw[j]
    if note:
        out.append(text(gx, H - 8, note, 12, INK2))
    if wells:
        px = vw
        out.append(rect(px, 0.5, pane - 0.5, H - 1, "#F8F8F8", "#D2D0CE", 0))
        out.append(text(px + 14, 30, "Build visual", 13, INK, 600))
        yy = 50
        for name, fields in wells:
            out.append(text(px + 14, yy + 14, name, 12.5, INK, 600))
            yy += 22
            for f in fields:
                out.append(rect(px + 14, yy, pane - 30, 24, PANEL, LINE, 2))
                out.append(text(px + 22, yy + 16, f, 12.5, INK))
                yy += 30
            yy += 10
    return wrap(w, H, "".join(out), caption, "#E9E7E5")


# ---------- Performance Analyzer pane ----------
def perf_pane(rows, caption, w=640):
    """rows: [(visual, total_ms, dax_ms, display_ms, other_ms, expanded_bool)]"""
    out = [text(20, 34, "Performance analyzer", 15, INK, 600)]
    bx = 20
    for b in ("Start recording", "Refresh visuals", "Stop", "Clear", "Export"):
        bw = 16 + 7 * len(b)
        out.append(rect(bx, 48, bw, 26, PANEL, "#8A8886", 2))
        out.append(text(bx + bw / 2, 66, b, 12, INK, 400, "middle"))
        bx += bw + 6
    y = 92
    out.append(text(24, y + 14, "Name", 12, INK2, 600))
    out.append(text(w - 24, y + 14, "Duration (ms)", 12, INK2, 600, "end"))
    out.append(line(20, y + 24, w - 20, y + 24, "#C8C6C4", 1))
    y += 30
    for vis, tot, dq, disp, oth, exp in rows:
        out.append(text(24, y + 16, ("⊟ " if exp else "⊞ ") + vis, 13, INK, 600))
        out.append(text(w - 24, y + 16, f"{tot:,}", 13, INK, 600, "end"))
        y += 26
        if exp:
            for lab, v in (("DAX query", dq), ("Visual display", disp), ("Other", oth)):
                out.append(text(52, y + 16, lab, 12.5, INK))
                out.append(text(w - 24, y + 16, f"{v:,}", 12.5, INK, 400, "end"))
                y += 24
            out.append(text(52, y + 16, "Copy query", 12.5, "#0F6CBD"))
            y += 26
        out.append(line(20, y + 2, w - 20, y + 2, "#EDEBE9", 1))
        y += 8
    return wrap(w, y + 16, "".join(out), caption, PANEL)


# ---------- Deployment pipeline ----------
def pipeline(stages, caption, w=900, h=260, compare=None):
    """stages: [(name, workspace, [items], status)]; compare: list of between-stage notes, e.g. ['2 differences', 'Same']"""
    out = [text(20, 34, "Deployment pipeline", 16, INK, 600)]
    n = len(stages)
    sw = (w - 40 - 60 * (n - 1)) / n
    for i, (name, ws, items, status) in enumerate(stages):
        x = 20 + i * (sw + 60)
        out.append(rect(x, 54, sw, h - 74, PANEL, "#8A8886", 6))
        out.append(text(x + 14, 80, name, 14, INK, 600))
        out.append(text(x + 14, 100, ws, 12, INK2))
        for k, it in enumerate(items):
            out.append(text(x + 14, 128 + 22 * k, "▪ " + it, 12.5, INK))
        if status:
            out.append(text(x + 14, h - 32, status, 12, "#0F6CBD", 600))
        if i < n - 1:
            ax = x + sw + 8
            out.append(line(ax, h / 2 + 10, ax + 44, h / 2 + 10, INK2, 1.5))
            out.append(f'<path d="M{ax+44} {h/2+5} L{ax+52} {h/2+10} L{ax+44} {h/2+15}Z" fill="{INK2}"/>')
            if compare:
                out.append(text(ax + 26, h / 2 - 4, compare[i], 10.5, "#8A6100" if compare[i] != "Same" else "#107C10", 600, "middle"))
    return wrap(w, h, "".join(out), caption, "#FAF9F8")
