#!/usr/bin/env python3
"""Rewrite the essays list in index.html from the Substack archive API."""
import html
import json
import re
import sys
import urllib.request

SUBSTACK = "https://connorstevensessays.substack.com"
INDEX = "index.html"
LIMIT = 50

req = urllib.request.Request(
    f"{SUBSTACK}/api/v1/archive?sort=new&limit={LIMIT}",
    headers={"User-Agent": "Mozilla/5.0"},
)
with urllib.request.urlopen(req, timeout=30) as resp:
    posts = json.load(resp)

# The API returns newest first; keep only public essays
items = [
    f'          <li><a href="{html.escape(p["canonical_url"], quote=True)}" '
    f'target="_blank" rel="noopener">{html.escape(p["title"])}</a></li>'
    for p in posts
    if p.get("type") == "newsletter" and p.get("audience") == "everyone"
]
if not items:
    sys.exit("No public posts returned; refusing to overwrite the list.")

page = open(INDEX, encoding="utf-8").read()
new_page, n = re.subn(
    r"(<!-- essays:start -->\n).*?(          <!-- essays:end -->)",
    lambda m: m.group(1) + "\n".join(items) + "\n" + m.group(2),
    page,
    flags=re.S,
)
if n != 1:
    sys.exit("essays:start/essays:end markers not found in index.html")

if new_page != page:
    open(INDEX, "w", encoding="utf-8").write(new_page)
    print(f"Updated essays list ({len(items)} essays)")
else:
    print("Essays list already up to date")
