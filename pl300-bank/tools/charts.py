"""Power BI-style chart exhibits drawn as SVG."""
import math
from svgkit import text, rect, line, wrap, e, INK, INK2, PANEL, PBI, FONT

GRID = "#E1DFDD"


def _frame(w, h, title, legend):
    out = [rect(20, 20, w - 40, h - 40, PANEL, "#D2D0CE", 0), text(36, 46, title, 14, INK, 600)]
    if legend:
        lx = 36
        out.append(text(lx, 68, legend[0], 11.5, INK2))
        lx += 8 + 6.5 * len(legend[0])
        for i, name in enumerate(legend[1]):
            col = legend[2][i] if len(legend) > 2 else PBI[i]
            out.append(f'<circle cx="{lx+5}" cy="{64}" r="5" fill="{col}"/>')
            out.append(text(lx + 14, 68, name, 11.5, INK))
            lx += 26 + 6.5 * len(name)
    return out


def _fmt(v):
    if abs(v) >= 1_000_000:
        return f"{v/1_000_000:g}M"
    if abs(v) >= 1000:
        return f"{v/1000:g}K"
    return f"{v:g}"


def nice(m, lo=0):
    """Return (hi, ticks) giving round tick values from lo up to at least m."""
    span = (m - lo) or 1
    raw = span / 5
    mag = 10 ** math.floor(math.log10(raw))
    for f in (1, 2, 2.5, 5, 10):
        if raw <= f * mag:
            step = f * mag
            break
    hi = lo + step * math.ceil(span / step)
    return hi, int(round((hi - lo) / step))


def _yaxis(out, x0, y0, x1, y1, lo, hi, ticks=5, fmt=_fmt, right=False):
    for i in range(ticks + 1):
        v = lo + (hi - lo) * i / ticks
        y = y1 - (y1 - y0) * i / ticks
        if not right:
            out.append(line(x0, y, x1, y, GRID, 1))
            out.append(text(x0 - 6, y + 4, fmt(v), 11, INK2, 400, "end"))
        else:
            out.append(text(x1 + 6, y + 4, fmt(v), 11, INK2, 400, "start"))


def column(title, cats, series, caption, w=760, h=380, stacked=False, pct=False, lo=0, hi=None, ref_lines=None,
           labels=False, horizontal=False, legend_title="", colors=None, xlabel=None):
    """series: [(name, [values])]. ref_lines: [(label, value, dashed)]"""
    colors = colors or PBI
    leg = (legend_title, [s[0] for s in series], colors) if len(series) > 1 else None
    out = _frame(w, h, title, leg)
    top = 86 if leg else 70
    if horizontal:
        return _bars(out, w, h, top, cats, series, caption, colors, lo, hi, labels, ref_lines)
    x0, x1, y0, y1 = 80, w - 40, top + 10, h - 70
    if pct:
        totals = [sum(s[1][i] for s in series) for i in range(len(cats))]
        series = [(n, [v / t * 100 if t else 0 for v, t in zip(vals, totals)]) for n, vals in series]
        hi = 100
    if hi is None:
        m = max((sum(s[1][i] for s in series) if stacked or pct else max(s[1][i] for s in series)) for i in range(len(cats)))
        if ref_lines:
            m = max(m, max(r[1] for r in ref_lines))
        hi, nt = nice(m, lo)
    else:
        nt = nice(hi, lo)[1] if not pct else 5
    if pct:
        nt = 5
    _yaxis(out, x0, y0, x1, y1, lo, hi, ticks=nt, fmt=(lambda v: f"{v:g}%") if pct else _fmt)
    n = len(cats)
    slot = (x1 - x0) / n
    k = 1 if (stacked or pct) else len(series)
    bw = min(48, slot * 0.7 / k)
    sc = lambda v: y1 - (y1 - y0) * (max(min(v, hi), lo) - lo) / (hi - lo)
    for i, c in enumerate(cats):
        cx = x0 + slot * i + slot / 2
        base = y1
        for j, (name, vals) in enumerate(series):
            v = vals[i]
            if stacked or pct:
                hgt = (y1 - y0) * v / (hi - lo)
                out.append(rect(cx - bw / 2, base - hgt, bw, hgt, colors[j], "none", 0, 0))
                base -= hgt
            else:
                bx = cx - (bw * k) / 2 + bw * j
                out.append(rect(bx, sc(v), bw - 1, y1 - sc(v), colors[j], "none", 0, 0))
                if labels:
                    out.append(text(bx + bw / 2, sc(v) - 5, _fmt(v), 10.5, INK2, 400, "middle"))
        out.append(text(cx, y1 + 18, c, 11, INK, 400, "middle"))
    if ref_lines:
        for lab, v, dashed in ref_lines:
            yy = sc(v)
            out.append(line(x0, yy, x1, yy, "#323130", 1.5, "6 4" if dashed else None))
            out.append(rect(x0 + 2, yy - 19, 7 * len(lab) + 8, 15, "#FFFFFF", "none", 0, 0))
            out.append(text(x0 + 6, yy - 7, lab, 11, "#323130", 600, "start"))
    if xlabel:
        out.append(text((x0 + x1) / 2, h - 34, xlabel, 11.5, INK2, 400, "middle"))
    return wrap(w, h, "".join(out), caption, "#E9E7E5")


def _bars(out, w, h, top, cats, series, caption, colors, lo, hi, labels, ref_lines):
    x0, x1, y0, y1 = 150, w - 60, top + 10, h - 50
    m = max(max(s[1]) for s in series)
    hi = hi or m * 1.1
    for i in range(6):
        v = lo + (hi - lo) * i / 5
        x = x0 + (x1 - x0) * i / 5
        out.append(line(x, y0, x, y1, GRID, 1))
        out.append(text(x, y1 + 18, _fmt(v), 11, INK2, 400, "middle"))
    slot = (y1 - y0) / len(cats)
    bh = min(26, slot * 0.7)
    for i, c in enumerate(cats):
        cy = y0 + slot * i + slot / 2
        v = series[0][1][i]
        bw = (x1 - x0) * (v - lo) / (hi - lo)
        out.append(rect(x0, cy - bh / 2, bw, bh, colors[0], "none", 0, 0))
        out.append(text(x0 - 8, cy + 4, c, 11.5, INK, 400, "end"))
        if labels:
            out.append(text(x0 + bw + 6, cy + 4, _fmt(v), 11, INK2))
    return wrap(w, h, "".join(out), caption, "#E9E7E5")


def linechart(title, cats, series, caption, w=760, h=380, lo=0, hi=None, forecast=None, ref_lines=None, markers=False,
              secondary=None, columns=None, legend_title="", label_every=1):
    """series: [(name, values)] on the primary axis. columns: [(name, values)] drawn as columns (combo chart).
       secondary: (name, values, fmt) line on a secondary axis. forecast: (values, lower, upper) after last cat."""
    names = ([c[0] for c in columns] if columns else []) + [s[0] for s in series] + ([secondary[0]] if secondary else [])
    leg = (legend_title, names, PBI) if len(names) > 1 else None
    out = _frame(w, h, title, leg)
    top = 86 if leg else 70
    x0, x1, y0, y1 = 80, w - (70 if secondary else 40), top + 10, h - 70
    allv = [v for s in series for v in s[1]] + ([v for c in columns for v in c[1]] if columns else [])
    n = len(cats) + (len(forecast[0]) if forecast else 0)
    if forecast:
        allv += forecast[2]
    if hi is None:
        hi, nt = nice(max(allv), lo)
    else:
        nt = nice(hi, lo)[1]
    _yaxis(out, x0, y0, x1, y1, lo, hi, ticks=nt)
    slot = (x1 - x0) / n
    X = lambda i: x0 + slot * i + slot / 2
    Y = lambda v: y1 - (y1 - y0) * (v - lo) / (hi - lo)
    ci = 0
    if columns:
        bw = min(36, slot * 0.6)
        for name, vals in columns:
            for i, v in enumerate(vals):
                out.append(rect(X(i) - bw / 2, Y(v), bw, y1 - Y(v), PBI[ci], "none", 0, 0))
            ci += 1
    for name, vals in series:
        pts = " ".join(f"{X(i):.1f},{Y(v):.1f}" for i, v in enumerate(vals))
        out.append(f'<polyline points="{pts}" fill="none" stroke="{PBI[ci]}" stroke-width="2.5"/>')
        if markers:
            for i, v in enumerate(vals):
                out.append(f'<circle cx="{X(i):.1f}" cy="{Y(v):.1f}" r="3.5" fill="{PBI[ci]}"/>')
        ci += 1
    if forecast:
        fv, flo, fhi = forecast
        last = len(cats) - 1
        band = [(X(last), Y(series[0][1][-1]))] + [(X(last + 1 + i), Y(u)) for i, u in enumerate(fhi)]
        band += [(X(last + 1 + i), Y(l)) for i, l in reversed(list(enumerate(flo)))] + [(X(last), Y(series[0][1][-1]))]
        out.append(f'<polygon points="{" ".join(f"{a:.1f},{b:.1f}" for a, b in band)}" fill="#118DFF" fill-opacity="0.15"/>')
        pts = f"{X(last):.1f},{Y(series[0][1][-1]):.1f} " + " ".join(f"{X(last+1+i):.1f},{Y(v):.1f}" for i, v in enumerate(fv))
        out.append(f'<polyline points="{pts}" fill="none" stroke="#118DFF" stroke-width="2" stroke-dasharray="6 4"/>')
    if secondary:
        sname, svals, sfmt = secondary
        shi, snt = nice(max(svals) * 1.1)
        for i in range(snt + 1):
            out.append(text(x1 + 6, y1 - (y1 - y0) * i / snt + 4, sfmt(shi * i / snt), 11, INK2))
        pts = " ".join(f"{X(i):.1f},{y1 - (y1 - y0) * v / shi:.1f}" for i, v in enumerate(svals))
        out.append(f'<polyline points="{pts}" fill="none" stroke="{PBI[ci]}" stroke-width="2.5"/>')
        for i, v in enumerate(svals):
            out.append(f'<circle cx="{X(i):.1f}" cy="{y1 - (y1 - y0) * v / shi:.1f}" r="3.5" fill="{PBI[ci]}"/>')
    labels = list(cats) + ([f"" for _ in forecast[0]] if forecast else [])
    for i, c in enumerate(labels):
        if c and i % label_every == 0:
            out.append(text(X(i), y1 + 18, c, 11, INK, 400, "middle"))
    if ref_lines:
        for lab, v, dashed in ref_lines:
            out.append(line(x0, Y(v), x1, Y(v), "#323130", 1.5, "6 4" if dashed else None))
            out.append(text(x1 - 4, Y(v) - 6, lab, 11, "#323130", 600, "end"))
    return wrap(w, h, "".join(out), caption, "#E9E7E5")


def scatter(title, pts, caption, xlabel, ylabel, w=760, h=400, xmax=None, ymax=None, yfmt=_fmt, xfmt=_fmt):
    """pts: [(label, x, y)]"""
    out = _frame(w, h, title, None)
    x0, x1, y0, y1 = 90, w - 50, 80, h - 80
    xmax, xt = nice(xmax or max(p[1] for p in pts) * 1.1)
    ymax, yt = nice(ymax or max(p[2] for p in pts) * 1.1)
    _yaxis(out, x0, y0, x1, y1, 0, ymax, ticks=yt, fmt=yfmt)
    for i in range(xt + 1):
        x = x0 + (x1 - x0) * i / xt
        out.append(text(x, y1 + 18, xfmt(xmax * i / xt), 11, INK2, 400, "middle"))
    for lab, xv, yv in pts:
        cx, cy = x0 + (x1 - x0) * xv / xmax, y1 - (y1 - y0) * yv / ymax
        out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="7" fill="#118DFF" fill-opacity="0.85"/>')
        out.append(text(cx + 10, cy - 8, lab, 11.5, INK))
    out.append(text((x0 + x1) / 2, h - 40, xlabel, 12, INK2, 400, "middle"))
    out.append(f'<text x="28" y="{(y0+y1)/2}" font-family="{FONT}" font-size="12" fill="{INK2}" text-anchor="middle" transform="rotate(-90 28 {(y0+y1)/2})">{e(ylabel)}</text>')
    return wrap(w, h, "".join(out), caption, "#E9E7E5")


def pie(title, slices, caption, w=560, h=380, donut=False):
    """slices: [(label, value)]"""
    names = [s[0] for s in slices]
    out = _frame(w, h, title, ("", names, PBI))
    cx, cy, r = w / 2, h / 2 + 30, min(w, h) / 2 - 80
    tot = sum(v for _, v in slices)
    a = -math.pi / 2
    for i, (lab, v) in enumerate(slices):
        b = a + 2 * math.pi * v / tot
        large = 1 if b - a > math.pi else 0
        x1, y1, x2, y2 = cx + r * math.cos(a), cy + r * math.sin(a), cx + r * math.cos(b), cy + r * math.sin(b)
        out.append(f'<path d="M{cx} {cy} L{x1:.1f} {y1:.1f} A{r} {r} 0 {large} 1 {x2:.1f} {y2:.1f}Z" fill="{PBI[i % 9]}" stroke="#fff" stroke-width="1.5"/>')
        m = (a + b) / 2
        out.append(text(cx + (r + 18) * math.cos(m), cy + (r + 18) * math.sin(m) + 4, f"{v / tot * 100:.0f}%", 11, INK2, 400,
                        "start" if math.cos(m) > 0.1 else ("end" if math.cos(m) < -0.1 else "middle")))
        a = b
    if donut:
        out.append(f'<circle cx="{cx}" cy="{cy}" r="{r*0.55}" fill="#fff"/>')
    return wrap(w, h, "".join(out), caption, "#E9E7E5")


def waterfall(title, start, steps, caption, w=760, h=380, start_label="Start", end_label="End"):
    """steps: [(label, delta)]"""
    out = _frame(w, h, title, ("", ["Increase", "Decrease", "Total"], ["#1AAB40", "#D64554", "#118DFF"]))
    x0, x1, y0, y1 = 80, w - 40, 96, h - 70
    vals = [start]
    cur = start
    for _, d in steps:
        cur += d
        vals.append(cur)
    hi, nt = nice(max(vals) * 1.1)
    _yaxis(out, x0, y0, x1, y1, 0, hi, ticks=nt)
    n = len(steps) + 2
    slot = (x1 - x0) / n
    bw = slot * 0.6
    Y = lambda v: y1 - (y1 - y0) * v / hi
    def bar(i, a, b, col, lab, show):
        top, bot = Y(max(a, b)), Y(min(a, b))
        cx = x0 + slot * i + slot / 2
        out.append(rect(cx - bw / 2, top, bw, bot - top, col, "none", 0, 0))
        out.append(text(cx, top - 6, show, 10.5, INK2, 400, "middle"))
        out.append(text(cx, y1 + 18, lab, 11, INK, 400, "middle"))
    bar(0, 0, start, "#118DFF", start_label, _fmt(start))
    cur = start
    for i, (lab, d) in enumerate(steps, start=1):
        bar(i, cur, cur + d, "#1AAB40" if d >= 0 else "#D64554", lab, ("+" if d >= 0 else "") + _fmt(d))
        cur += d
    bar(n - 1, 0, cur, "#118DFF", end_label, _fmt(cur))
    return wrap(w, h, "".join(out), caption, "#E9E7E5")


def kpi(title, value, goal_text, status, caption, trend=None, w=420, h=280):
    """status: 'good' | 'bad' | 'neutral'"""
    col = {"good": "#1AAB40", "bad": "#D64554", "neutral": "#605E5C"}[status]
    out = [rect(20, 20, w - 40, h - 40, PANEL, "#D2D0CE", 0), text(36, 46, title, 14, INK, 600)]
    if trend:
        mx, mn = max(trend), min(trend)
        x0, x1, ty0, ty1 = 21, w - 21, h / 2 + 62, h - 21
        pts = [(x0 + (x1 - x0) * i / (len(trend) - 1), ty1 - (ty1 - ty0) * (v - mn) / (mx - mn or 1)) for i, v in enumerate(trend)]
        poly = " ".join(f"{a:.1f},{b:.1f}" for a, b in pts) + f" {x1},{ty1} {x0},{ty1}"
        out.append(f'<polygon points="{poly}" fill="{col}" fill-opacity="0.15"/>')
    out.append(text(w / 2, h / 2 + 10, value, 44, col, 600, "middle"))
    out.append(text(w / 2, h / 2 + 44, goal_text, 13, INK2, 400, "middle"))
    return wrap(w, h, "".join(out), caption, "#E9E7E5")


def gauge(title, value, minv, maxv, target, caption, w=480, h=300, fmt=_fmt):
    out = [rect(20, 20, w - 40, h - 40, PANEL, "#D2D0CE", 0), text(36, 46, title, 14, INK, 600)]
    cx, cy, r = w / 2, h - 70, 120
    def pt(v, rr):
        ang = math.pi * (1 - (v - minv) / (maxv - minv))
        return cx + rr * math.cos(ang), cy - rr * math.sin(ang)
    sx, sy = pt(minv, r); ex, ey = pt(maxv, r)
    out.append(f'<path d="M{sx:.1f} {sy:.1f} A{r} {r} 0 0 1 {ex:.1f} {ey:.1f}" fill="none" stroke="#E1DFDD" stroke-width="34"/>')
    vx, vy = pt(value, r)
    out.append(f'<path d="M{sx:.1f} {sy:.1f} A{r} {r} 0 0 1 {vx:.1f} {vy:.1f}" fill="none" stroke="#118DFF" stroke-width="34"/>')
    t1, t2 = pt(target, r - 22), pt(target, r + 22)
    out.append(line(t1[0], t1[1], t2[0], t2[1], "#252423", 3))
    out.append(text(cx, cy - 10, fmt(value), 28, INK, 600, "middle"))
    out.append(text(sx, cy + 22, fmt(minv), 11, INK2, 400, "middle"))
    out.append(text(ex, cy + 22, fmt(maxv), 11, INK2, 400, "middle"))
    out.append(text(t2[0], t2[1] - 6, f"Target {fmt(target)}", 11, INK, 600, "middle"))
    return wrap(w, h, "".join(out), caption, "#E9E7E5")


def data_table(title, headers, rows, caption, w=640, bars_col=None, icon_col=None, col_w=None):
    """rows: list of lists (strings). bars_col: index of numeric column to draw data bars (uses float of text).
       icon_col: index of column whose cell starts with '▲','▼','●' rendered coloured."""
    out = [rect(20, 20, w - 40, 72 + 26 * len(rows), PANEL, "#D2D0CE", 0), text(36, 46, title, 14, INK, 600)]
    cw = col_w or [(w - 72) / len(headers)] * len(headers)
    gx, y = 36, 62
    x = gx
    for j, hd in enumerate(headers):
        out.append(text(x + 6 if j == 0 else x + cw[j] - 8, y + 18, hd, 12.5, INK, 600, "start" if j == 0 else "end"))
        x += cw[j]
    out.append(line(gx, y + 26, gx + sum(cw), y + 26, "#8A8886", 1))
    mx = max(float(r[bars_col].replace(",", "")) for r in rows) if bars_col is not None else 1
    for i, r in enumerate(rows):
        yy = y + 26 + 26 * i
        x = gx
        for j, v in enumerate(r):
            if j == bars_col:
                val = float(v.replace(",", ""))
                out.append(rect(x + 6, yy + 5, (cw[j] - 12) * val / mx, 16, "#9CC9F7", "none", 0, 0))
            if j == icon_col and v[:1] in "▲▼●":
                c = {"▲": "#1AAB40", "▼": "#D64554", "●": "#E3A21A"}[v[0]]
                out.append(text(x + cw[j] - 8, yy + 18, v[0], 13, c, 700, "end"))
                out.append(text(x + cw[j] - 24, yy + 18, v[1:].strip(), 12.5, INK, 400, "end"))
            else:
                out.append(text(x + 6 if j == 0 else x + cw[j] - 8, yy + 18, v, 12.5, INK, 400, "start" if j == 0 else "end"))
            x += cw[j]
    return wrap(w, 112 + 26 * len(rows), "".join(out), caption, "#E9E7E5")


def filters_pane(sections, caption, w=340):
    """sections: [(heading, [(field, state)])]"""
    out = [text(20, 34, "Filters", 15, INK, 600)]
    y = 52
    for head, cards in sections:
        out.append(text(20, y + 14, head, 12.5, INK2, 600))
        y += 24
        for field, state in cards:
            out.append(rect(20, y, w - 40, 46, PANEL, "#C8C6C4", 3))
            out.append(text(32, y + 19, field, 13, INK, 600))
            out.append(text(32, y + 37, state, 12, INK2))
            y += 54
        y += 8
    return wrap(w, y + 8, "".join(out), caption, "#F8F8F8")


def key_influencers(question, items, caption, w=820, h=360, tab="Key influencers"):
    """items: [(description, factor_text, bar_value)] ; right panel shows the selected (first) influencer as a column comparison."""
    out = [rect(20, 20, w - 40, h - 40, PANEL, "#D2D0CE", 0)]
    tx = 36
    for t in ("Key influencers", "Top segments"):
        sel = t == tab
        out.append(text(tx, 48, t, 13.5, INK if sel else INK2, 600 if sel else 400))
        if sel:
            out.append(line(tx, 56, tx + 7.4 * len(t), 56, "#118DFF", 3))
        tx += 8 * len(t) + 30
    out.append(text(36, 84, question, 13, INK, 600))
    out.append(text(36, 104, "When...", 11.5, INK2))
    out.append(text(w / 2 - 30, 104, "...the likelihood increases by", 11.5, INK2, 400, "end"))
    mx = max(i[2] for i in items)
    for k, (desc, fac, val) in enumerate(items):
        y = 116 + 38 * k
        if k == 0:
            out.append(rect(30, y - 2, w / 2 - 40, 34, "#E1EFFA", "none", 2, 0))
        out.append(text(40, y + 20, desc, 12.5, INK))
        bx = w / 2 - 150
        out.append(rect(bx, y + 8, 85 * val / mx, 12, "#118DFF", "none", 0, 0))
        out.append(text(w / 2 - 30, y + 20, fac, 12.5, INK, 600, "end"))
    # right panel: comparison bars for first influencer
    px = w / 2 + 10
    out.append(line(px - 10, 70, px - 10, h - 40, "#E1DFDD", 1))
    d0, f0, v0 = items[0]
    out.append(text(px + 10, 84, d0, 12.5, INK, 600))
    out.append(text(px + 10, 102, f"is {f0} more likely to be the outcome", 11.5, INK2))
    vals = [("Influencer", 0.62), ("Everyone else", 0.62 / float(f0.rstrip('x')))]
    for k, (lab, v) in enumerate(vals):
        bx = px + 60 + 140 * k
        bh = 170 * v
        out.append(rect(bx, h - 70 - bh, 60, bh, "#118DFF" if k == 0 else "#C8C6C4", "none", 0, 0))
        out.append(text(bx + 30, h - 70 - bh - 6, f"{v*100:.0f}%", 11, INK2, 400, "middle"))
        out.append(text(bx + 30, h - 52, lab, 11.5, INK, 400, "middle"))
    return wrap(w, h, "".join(out), caption, "#E9E7E5")


def decomp_tree(title, levels, caption, w=860, h=380):
    """levels: [(field_name, [(label, value, highlighted)], split_note)]; first level is the root measure."""
    out = [rect(20, 20, w - 40, h - 40, PANEL, "#D2D0CE", 0), text(36, 46, title, 14, INK, 600)]
    colw = (w - 80) / len(levels)
    prev = None
    for c, (field, nodes, note) in enumerate(levels):
        x = 40 + colw * c
        out.append(text(x, 74, field, 12, INK2, 600))
        if note:
            out.append(text(x, 90, note, 11, "#0F6CBD"))
        mx = max(n[1] for n in nodes)
        for r, (lab, val, hl) in enumerate(nodes):
            y = 108 + 44 * r
            out.append(text(x, y + 12, lab, 12, INK, 600 if hl else 400))
            out.append(rect(x, y + 18, (colw - 50) * val / mx, 10, "#118DFF" if hl else "#9CC9F7", "none", 0, 0))
            out.append(text(x + colw - 46, y + 12, f"{val:,}", 11.5, INK2, 400, "end"))
            if hl:
                if prev:
                    out.append(f'<path d="M{prev[0]} {prev[1]} C{prev[0]+20} {prev[1]} {x-20} {y+23} {x-4} {y+23}" fill="none" stroke="#605E5C" stroke-width="1.2"/>')
                prev = (x + colw - 44, y + 23)
    return wrap(w, h, "".join(out), caption, "#E9E7E5")


def anomaly_chart(title, cats, vals, anomalies, band, caption, w=760, h=360):
    """anomalies: indexes to mark; band: (lower, upper) lists for the expected range."""
    out = _frame(w, h, title, None)
    x0, x1, y0, y1 = 80, w - 40, 80, h - 70
    hi, nt = nice(max(vals + band[1]) * 1.05)
    _yaxis(out, x0, y0, x1, y1, 0, hi, ticks=nt)
    n = len(vals)
    X = lambda i: x0 + (x1 - x0) * i / (n - 1)
    Y = lambda v: y1 - (y1 - y0) * v / hi
    poly = [f"{X(i):.1f},{Y(u):.1f}" for i, u in enumerate(band[1])] + [f"{X(i):.1f},{Y(l):.1f}" for i, l in reversed(list(enumerate(band[0])))]
    out.append(f'<polygon points="{" ".join(poly)}" fill="#118DFF" fill-opacity="0.12"/>')
    out.append(f'<polyline points="{" ".join(f"{X(i):.1f},{Y(v):.1f}" for i, v in enumerate(vals))}" fill="none" stroke="#118DFF" stroke-width="2.2"/>')
    for i in anomalies:
        out.append(f'<circle cx="{X(i):.1f}" cy="{Y(vals[i]):.1f}" r="7" fill="#fff" stroke="#D64554" stroke-width="2.5"/>')
    for i, c in enumerate(cats):
        if c:
            out.append(text(X(i), y1 + 18, c, 11, INK, 400, "middle"))
    return wrap(w, h, "".join(out), caption, "#E9E7E5")


def side_pane(title, rows, caption, w=360):
    """rows: [(label, kind, state)] kind: 'item' | 'group' | 'child' | 'heading' | 'prompt' | 'reply' | 'button'"""
    out = [text(20, 34, title, 15, INK, 600)]
    y = 52
    for lab, kind, state in rows:
        if kind == "heading":
            out.append(text(20, y + 14, lab, 12, INK2, 600)); y += 26
        elif kind in ("item", "group", "child"):
            ind = 36 if kind == "child" else 20
            if state == "selected":
                out.append(rect(14, y, w - 28, 28, "#E1EFFA", "none", 2, 0))
            out.append(text(ind + 4, y + 19, ("▾ " if kind == "group" else "") + lab, 13, INK, 600 if kind == "group" else 400))
            if state in ("visible", "hidden", "selected"):
                eye = "◉" if state != "hidden" else "⊘"
                out.append(text(w - 24, y + 19, eye, 13, INK2 if state != "hidden" else "#A19F9D", 400, "end"))
            y += 30
        elif kind == "prompt":
            tw = min(w - 80, 7.2 * len(lab) + 24)
            out.append(rect(w - 20 - tw, y, tw, 30, "#E1EFFA", "none", 12, 0))
            out.append(text(w - 32, y + 20, lab, 12.5, INK, 400, "end")); y += 42
        elif kind == "reply":
            lines_ = state if isinstance(state, list) else [lab]
            hgt = 16 + 20 * len(lines_)
            out.append(rect(20, y, w - 60, hgt, "#F3F2F1", "none", 10, 0))
            for k, l in enumerate(lines_):
                out.append(text(32, y + 22 + 20 * k, l, 12.5, INK))
            y += hgt + 12
        elif kind == "button":
            bw = 16 + 7.3 * len(lab)
            out.append(rect(20, y, bw, 28, PANEL, "#8A8886", 14))
            out.append(text(20 + bw / 2, y + 19, lab, 12.5, INK, 400, "middle")); y += 36
    return wrap(w, y + 12, "".join(out), caption, PANEL)
