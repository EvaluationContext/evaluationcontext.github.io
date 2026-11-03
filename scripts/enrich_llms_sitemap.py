"""Enrich the generated llms.txt and sitemap.xml from the built pages.

Run after `zensical build`. Both files come out thin:

- llms.txt: the llmstxt plugin takes one description per section, so every
  post is listed as "Blog post", oldest first. This rewrites the Posts section
  with each post's own description and date, grouped by category, newest first,
  and gives the Pages entries their page descriptions.
- sitemap.xml: no <lastmod>, so crawlers can't tell what changed. Posts get
  their dateModified; the blog index, category and archive pages get the
  newest dateModified among the posts in that category or year.

Everything is read from site/ (each post's BlogPosting JSON-LD and meta
description), so URLs and text match what is actually served.
"""

import html
import json
import re
import sys
import tomllib
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"

with open(ROOT / "zensical.toml", "rb") as f:
    project = tomllib.load(f)["project"]
SITE_URL = project["site_url"].rstrip("/") + "/"

# Minified HTML drops attribute quotes where it can
LD_JSON = re.compile(r"<script type=\"?application/ld\+json\"?>(.*?)</script>", re.S)
META_DESC = re.compile(r"<meta name=\"?description\"? content=(\"[^\"]*\"|[^ >]+)")
LLMS_LINK = re.compile(r"^- \[(?P<title>.*)\]\(<(?P<url>[^>]+)>\)(?::\s*(?P<desc>.*))?$")


def html_path(url: str) -> Path | None:
    """site/ file for a page URL (…/page/ or …/page/index.md)."""
    if not url.startswith(SITE_URL):
        return None
    rel = url[len(SITE_URL):]
    rel = re.sub(r"index\.md$", "", rel)
    path = SITE / rel / "index.html"
    return path if path.is_file() else None


def unquote(value: str) -> str:
    return html.unescape(value.strip('"'))


def page_info(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    info: dict = {}
    m = META_DESC.search(text)
    if m:
        info["description"] = unquote(m.group(1))
    for block in LD_JSON.findall(text):
        try:
            ld = json.loads(block)
        except json.JSONDecodeError:
            continue
        if ld.get("@type") == "BlogPosting":
            info["post"] = ld
    return info


_cache: dict[Path, dict] = {}


def info_for(url: str) -> dict | None:
    path = html_path(url)
    if path is None:
        return None
    if path not in _cache:
        _cache[path] = page_info(path)
    return _cache[path]


def day(iso: str) -> str:
    return iso[:10]


# ---------------------------------------------------------------------------
# llms.txt
# ---------------------------------------------------------------------------


def rewrite_llms() -> int:
    path = SITE / "llms.txt"
    lines = path.read_text(encoding="utf-8").splitlines()

    out: list[str] = []
    section = None
    posts: list[dict] = []
    posts_at = None
    for line in lines:
        if line.startswith("## "):
            section = line[3:].strip()
            if section == "Posts":
                posts_at = len(out)
                continue
        m = LLMS_LINK.match(line)
        if m and section == "Posts":
            info = info_for(m["url"]) or {}
            ld = info.get("post", {})
            posts.append(
                {
                    "title": m["title"],
                    "url": m["url"],
                    "description": ld.get("description") or info.get("description") or "",
                    "date": ld.get("datePublished", ""),
                    "category": (ld.get("keywords") or ["Other"])[0],
                }
            )
            continue
        if section == "Posts" and not line.strip():
            continue
        if m:
            info = info_for(m["url"]) or {}
            desc = info.get("description") or m["desc"] or ""
            line = f"- [{m['title']}](<{m['url']}>): {desc}"
        out.append(line)

    if posts_at is None:
        sys.exit("llms.txt has no '## Posts' section")

    by_cat: dict[str, list[dict]] = defaultdict(list)
    for p in posts:
        by_cat[p["category"]].append(p)
    for group in by_cat.values():
        group.sort(key=lambda p: p["date"], reverse=True)
    # Categories with the most recent writing first
    order = sorted(by_cat, key=lambda c: by_cat[c][0]["date"], reverse=True)

    block = ["## Posts", ""]
    for cat in order:
        block += [f"### {cat}", ""]
        for p in by_cat[cat]:
            when = f" ({day(p['date'])})" if p["date"] else ""
            block.append(f"- [{p['title']}](<{p['url']}>): {p['description']}{when}")
        block.append("")
    out[posts_at:posts_at] = block

    path.write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")
    return len(posts)


# ---------------------------------------------------------------------------
# sitemap.xml
# ---------------------------------------------------------------------------


def page_title(url: str) -> str:
    text = html_path(url).read_text(encoding="utf-8")
    m = re.search(r"<title>([^<]*)", text)
    return html.unescape(m.group(1)).rsplit(" - ", 1)[0].strip() if m else ""


def is_listing(url: str) -> bool:
    rel = url[len(SITE_URL):]
    return rel == "" or rel.startswith(("category/", "archive/"))


def rewrite_sitemap() -> int:
    path = SITE / "sitemap.xml"
    text = path.read_text(encoding="utf-8")
    locs = re.findall(r"<loc>([^<]+)</loc>", text)

    modified: dict[str, str] = {}
    for url in locs:
        info = info_for(url)
        if info and "post" in info:
            ld = info["post"]
            modified[url] = day(ld.get("dateModified") or ld.get("datePublished", ""))

    # Listing pages: newest post they list. Matched on category / year rather
    # than links, since every page links the latest posts from its chrome.
    posts = [info_for(u)["post"] for u in locs if u in modified]
    for url in locs:
        if url in modified or not is_listing(url):
            continue
        rel = url[len(SITE_URL):]
        if rel.startswith("category/"):
            title = page_title(url)
            group = [p for p in posts if title in (p.get("keywords") or [])]
        elif rel.startswith("archive/"):
            year = rel.split("/")[1]
            group = [p for p in posts if p.get("datePublished", "").startswith(year)]
        else:
            group = posts
        dates = [day(p.get("dateModified") or p["datePublished"]) for p in group]
        if dates:
            modified[url] = max(dates)

    count = 0

    def add(m: re.Match) -> str:
        nonlocal count
        url = m.group(2)
        if url not in modified or "<lastmod>" in m.group(0):
            return m.group(0)
        count += 1
        return f"{m.group(1)}<lastmod>{modified[url]}</lastmod>"

    text = re.sub(r"(<loc>([^<]+)</loc>)(?![\s]*<lastmod>)", add, text)
    path.write_text(text, encoding="utf-8")
    return count


if not SITE.is_dir():
    sys.exit(f"{SITE} not found; run `zensical build` first")

print(f"llms.txt: {rewrite_llms()} posts described")
print(f"sitemap.xml: lastmod added to {rewrite_sitemap()} URLs")
