#!/usr/bin/env python3
"""Rewrite the essays list in index.html from Substack.

Tries the archive API, then the RSS feed. If Substack refuses both (it
sometimes blocks GitHub's servers), leave the list alone and exit cleanly
with a warning instead of failing the workflow.
"""
import html
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET

SUBSTACK = "https://connorstevensessays.substack.com"
INDEX = "index.html"
LIMIT = 50
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/130.0 Safari/537.36"
    ),
    "Accept": "application/json, application/xml;q=0.9, */*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
    "Referer": SUBSTACK + "/",
}


def get(path):
    req = urllib.request.Request(SUBSTACK + path, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def from_api():
    posts = json.loads(get(f"/api/v1/archive?sort=new&limit={LIMIT}"))
    return [
        (p["title"], p["canonical_url"])
        for p in posts
        if p.get("type") == "newsletter" and p.get("audience") == "everyone"
    ]


def from_feed():
    root = ET.fromstring(get("/feed"))
    return [
        (item.findtext("title"), item.findtext("link"))
        for item in root.iterfind("./channel/item")
    ]


essays = []
for source in (from_api, from_feed):
    try:
        essays = source()
    except Exception as e:  # blocked, network error, bad payload...
        print(f"{source.__name__} failed: {e}", file=sys.stderr)
        continue
    if essays:
        break

if not essays:
    print("::warning::Could not fetch essays from Substack; list left unchanged.")
    sys.exit(0)

items = [
    f'          <li><a href="{html.escape(url, quote=True)}" '
    f'target="_blank" rel="noopener">{html.escape(title)}</a></li>'
    for title, url in essays
]

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
