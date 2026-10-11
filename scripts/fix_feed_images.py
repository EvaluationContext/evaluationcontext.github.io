"""Repoint hero image URLs in the generated RSS and JSON feeds.

Run after `zensical build`. The RSS plugin builds each post's image URL from the
Markdown source path (docs/posts/<year>/<folder>/hero.jpg), so it emits
<site_url>/posts/<year>/<folder>/hero.jpg. Zensical actually serves the file at
<site_url>/<year>/<folder>/hero.jpg (the path the post pages and og:image use),
so the feed enclosures 404 and readers show no hero image.

This rewrites the enclosure URLs in both RSS feeds and the `image` field in both
JSON feeds, and prepends the image to each RSS item description so readers that
ignore enclosures still show it.
"""

import html
import re
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"

with open(ROOT / "zensical.toml", "rb") as f:
    site_url = tomllib.load(f)["project"]["site_url"].rstrip("/")

wrong = re.escape(site_url) + r"/posts/(?=20\d\d/)"
fixed = site_url + "/"


def fix_rss(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    count = 0

    def fix_item(m: re.Match) -> str:
        nonlocal count
        item = m.group(0)
        enc = re.search(r'<enclosure url="([^"]+)"', item)
        if not enc:
            return item
        url = re.sub(wrong, fixed, enc.group(1))
        if url != enc.group(1):
            count += 1
            item = item.replace(enc.group(1), url)
        img = html.escape(f'<p><img src="{url}" alt=""></p>')
        item = item.replace("<description>", f"<description>{img}", 1)
        return item

    text = re.sub(r"<item>.*?</item>", fix_item, text, flags=re.S)
    path.write_text(text, encoding="utf-8")
    return count


def fix_json(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    text, count = re.subn(r'("image":\s*")' + wrong, r"\1" + fixed, text)
    path.write_text(text, encoding="utf-8")
    return count


if not SITE.is_dir():
    sys.exit(f"{SITE} not found; run `zensical build` first")

for name in ("feed_rss_created.xml", "feed_rss_updated.xml"):
    print(f"{name}: {fix_rss(SITE / name)} image URLs fixed")
for name in ("feed_json_created.json", "feed_json_updated.json"):
    print(f"{name}: {fix_json(SITE / name)} image URLs fixed")
