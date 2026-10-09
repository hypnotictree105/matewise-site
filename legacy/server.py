#!/usr/bin/env python3
"""
MateWise - local web server. Zero dependencies, standard library only.

Run:
    python3 server.py

Then open:
    http://localhost:8000

WHY NO FASTAPI
--------------
Wanted to hand you something that runs the moment you download it, with
nothing to install. This uses only Python's built-in http.server. When
you're ready to actually deploy (Render, Fly.io, Vercel), converting this
to FastAPI is a small, mechanical step - the logic underneath doesn't
change, only how it's wired to the web.

WHAT THIS DOES
--------------
Thin HTTP wrapper around select.py. It parses the form input, calls the
SAME deterministic functions from select.py, and renders the result as
HTML. No new logic lives here - if the answer is wrong, the bug is in
select.py or data.json, not in this file. That separation matters: the
web layer should never be where compatibility decisions get made.
"""

import html
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs

from matewise_engine import load, parse_requirements, find_options, bom_for

FLAG_COLOR = {
    "verified": "#2FA84F", "inferred": "#D99A1B",
    "unknown": "#8A8F98", "": "#8A8F98",
}
FLAG_LABEL = {
    "verified": "VERIFIED", "inferred": "INFERRED \u2014 CHECK IT",
    "unknown": "UNKNOWN", "": "UNKNOWN",
}

PAGE_TOP = """<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MateWise</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --lime: #C6FF00;
    --ink: #121417;
    --slate: #2A2F36;
    --paper: #E5E7EB;
    --white: #FFFFFF;
    --ok: #2FA84F;
    --inf: #D99A1B;
    --unk: #8A8F98;
    --warn: #D9482B;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Space Grotesk', -apple-system, sans-serif;
    background: var(--ink);
    color: var(--paper);
    max-width: 780px;
    margin: 0 auto;
    padding: 48px 24px 80px;
    line-height: 1.5;
  }
  .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
  .mark {
    width: 34px; height: 34px; border-radius: 8px;
    background: var(--lime); color: var(--ink);
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 1.1em; flex-shrink: 0;
  }
  h1 { font-size: 1.6em; font-weight: 700; margin: 0; color: var(--white); }
  .tagline { color: var(--lime); font-size: 0.95em; margin: 4px 0 28px 46px; }
  form { display: flex; gap: 10px; margin-bottom: 8px; }
  input[type=text] {
    flex: 1; padding: 14px 16px; font-size: 1.05em;
    font-family: 'IBM Plex Mono', monospace;
    background: var(--slate); color: var(--white);
    border: 1px solid #3d434c; border-radius: 8px;
  }
  input[type=text]:focus { outline: none; border-color: var(--lime); }
  input[type=text]::placeholder { color: #6b7280; }
  button {
    padding: 14px 26px; font-size: 1.05em; font-weight: 500;
    background: var(--lime); color: var(--ink);
    border: none; border-radius: 8px; cursor: pointer;
    font-family: 'Space Grotesk', sans-serif;
  }
  button:hover { filter: brightness(1.08); }
  .hint { color: #8A8F98; font-size: 0.85em; margin: 0 0 32px; }
  .req-summary {
    color: var(--white); font-size: 1em; margin-bottom: 20px;
    padding-bottom: 16px; border-bottom: 1px solid #2A2F36;
  }
  .req-summary b { color: var(--lime); }
  .family {
    background: var(--slate); border: 1px solid #3d434c;
    border-radius: 10px; padding: 20px 22px; margin-bottom: 18px;
  }
  .family h3 {
    margin: 0 0 4px; font-size: 1.1em; color: var(--white);
    font-family: 'IBM Plex Mono', monospace; font-weight: 500;
  }
  .fam-tag {
    display: inline-block; background: var(--ink); color: var(--lime);
    font-size: 0.72em; font-weight: 700; letter-spacing: 0.04em;
    padding: 2px 8px; border-radius: 4px; margin-right: 8px;
    font-family: 'Space Grotesk', sans-serif; vertical-align: middle;
  }
  .meta { color: #9aa0a8; font-size: 0.88em; margin: 6px 0 14px; }
  .meta em { color: var(--inf); font-style: normal; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 6px; border-bottom: 1px solid #383e47; font-size: 0.92em; }
  tr:last-child td { border-bottom: none; }
  .pn { font-family: 'IBM Plex Mono', monospace; color: var(--white); }
  .qty { color: #9aa0a8; width: 34px; }
  .desc { color: #c4c9d0; }
  .flag {
    display: inline-block; font-weight: 700; font-size: 0.68em;
    letter-spacing: 0.03em; padding: 3px 7px; border-radius: 4px;
    color: var(--ink); white-space: nowrap;
    font-family: 'Space Grotesk', sans-serif;
  }
  .warn {
    background: rgba(217, 72, 43, 0.12); border: 1px solid var(--warn);
    border-radius: 8px; padding: 16px 18px; color: #f0b8a8; font-size: 0.95em;
  }
  .warn b { color: var(--white); }
  .rejected { font-family: 'IBM Plex Mono', monospace; font-size: 0.85em;
              color: #d99a8c; display: block; margin: 4px 0; }
  footer {
    color: #6b7280; font-size: 0.82em; margin-top: 48px;
    padding-top: 20px; border-top: 1px solid #2A2F36; line-height: 1.6;
  }
  .legend { display: flex; gap: 20px; margin: 24px 0 8px; flex-wrap: wrap; }
  .legend span { font-size: 0.78em; color: #9aa0a8; display: inline-flex;
                 align-items: center; margin-right: 4px; }
  .legend .dot { margin-right: 6px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
</style>
</head><body>
<div class="brand">
  <div class="mark">M</div>
  <h1>MateWise</h1>
</div>
<p class="tagline">Connect with certainty.</p>
<form method="get" action="/">
  <input type="text" name="req" placeholder="8x16 4x20" value="__PREFILL__" autofocus>
  <button type="submit">Find connectors</button>
</form>
<p class="hint">Format: count x AWG, space-separated \u2014 e.g. "8x16 4x20" means eight 16 AWG wires and four 20 AWG wires.</p>
"""

PAGE_BOTTOM = """
<div class="legend">
  <span><span class="dot" style="background:#2FA84F"></span>Verified against a manufacturer or distributor catalog</span>
  <span><span class="dot" style="background:#D99A1B"></span>Inferred \u2014 check before ordering</span>
  <span><span class="dot" style="background:#8A8F98"></span>Not yet in the database</span>
</div>
<footer>
  Answers, not guesses. Every line is checked against a source or flagged
  if it hasn't been \u2014 no model decides what mates with what. Stock and
  lead-time lookup isn't wired up yet.
</footer>
</body></html>
"""


def render_results(text):
    data = load()
    try:
        reqs = parse_requirements(text)
    except ValueError as e:
        return f'<div class="warn"><b>Couldn\'t read that.</b><br>{html.escape(str(e))}</div>'

    options, rejections = find_options(data, reqs)
    total = sum(c for c, _ in reqs)
    req_str = ", ".join(f"{c} \u00d7 {g} AWG" for c, g in reqs)

    out = [f'<p class="req-summary"><b>{total} positions</b> needed &mdash; {html.escape(req_str)}</p>']

    if not options:
        out.append('<div class="warn"><b>No single connector fits this requirement.</b><br><br>')
        for pn, fam, why in rejections[:5]:
            out.append(f'<span class="rejected">{html.escape(pn)}: {html.escape(why)}</span>')
        out.append('<br>This requirement may need two connectors.</div>')
        return "".join(out)

    grouped = {}
    for o in options:
        grouped.setdefault(o["family"], []).append(o)

    for fam, opts in grouped.items():
        best = opts[0]
        spare = f"{best['spare']} spare position(s)" if best["spare"] else "exact fit"
        out.append('<div class="family">')
        out.append(f'<h3><span class="fam-tag">{html.escape(fam)}</span>{html.escape(best["pn"])}</h3>')
        out.append(f'<p class="meta">{best["mount"]} mount &middot; {best["termination"]} &middot; {spare}')
        if best.get("note"):
            out.append(f' &middot; <em>{html.escape(best["note"])}</em>')
        out.append('</p><table>')
        for qty, pn, desc, ver in bom_for(data, best):
            color = FLAG_COLOR.get(ver, "#8A8F98")
            label = FLAG_LABEL.get(ver, "UNKNOWN")
            out.append(
                f"<tr><td class='qty'>{qty}\u00d7</td>"
                f"<td class='pn'>{html.escape(pn)}</td>"
                f"<td class='desc'>{html.escape(desc)}</td>"
                f"<td><span class='flag' style='background:{color}'>{label}</span></td></tr>"
            )
        out.append("</table></div>")

    return "".join(out)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/health"):
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"ok")
            return

        query = parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
        req_text = query.get("req", [""])[0]

        body = PAGE_TOP.replace("__PREFILL__", html.escape(req_text))
        if req_text.strip():
            try:
                body += render_results(req_text)
            except Exception as e:
                body += (f'<div class="warn">Error: {html.escape(str(e))}'
                         f'</div>')
        body += PAGE_BOTTOM

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(body.encode("utf-8"))

    def log_message(self, format, *args):
        pass  # keep the terminal quiet


def main():
    port = 8000
    server = HTTPServer(("localhost", port), Handler)
    print(f"\nMateWise running at http://localhost:{port}")
    print("Ctrl+C to stop.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
