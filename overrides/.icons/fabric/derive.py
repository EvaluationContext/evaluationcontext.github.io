"""Derive the monochrome `<name>-outline.svg` icons from the coloured `<name>.svg` ones.

Run from anywhere: `python overrides/.icons/fabric/derive.py`. For each coloured item
icon it drops the gradient background and its translucent overlay, keeps the border
ring and the glyph, and repaints: a light fill (a literal, or a gradient whose stops
are all light) is a knockout in the original — a badge's halo, the dots on the
warehouse — so it becomes the page background, `var(--md-default-bg-color)`, which
the theme sets for light and dark; everything else becomes currentColor. The icons
are inlined into the page, so the CSS variable resolves.
"""

from __future__ import annotations

import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
FULL_RECT = 'd="M24 0H0v24h24z"'
KNOCKOUT = "var(--md-default-bg-color)"
# Brand marks ship their own monochrome form in the package (`<name>_24_regular.svg`), copied by hand.
HAND_MADE = {"fabric"}


def luminance(hex_colour: str) -> float:
    h = hex_colour.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    r, g, b = (int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def light_gradients(svg: str) -> set[str]:
    ids: set[str] = set()
    pattern = r'<(?:linear|radial)Gradient id="([^"]+)"[^>]*>(.*?)</(?:linear|radial)Gradient>'
    for m in re.finditer(pattern, svg, flags=re.S):
        stops = re.findall(r'stop-color="(#[0-9A-Fa-f]{3,6})"', m.group(2))
        if stops and min(luminance(s) for s in stops) > 0.75:
            ids.add(m.group(1))
    return ids


def derive(svg: str) -> str:
    light = light_gradients(svg)
    body = re.sub(r"<defs>.*?</defs>", "", svg, flags=re.S)
    body = re.sub(r"<mask\b.*?</mask>", "", body, flags=re.S)
    body = re.sub(r"</?g\b[^>]*>", "", body)
    elements = re.findall(r"<(?:path|circle|rect|ellipse)\b[^>]*/>", body)
    overlay_ds = {
        m.group(1)
        for e in elements
        if "fill-opacity" in e
        for m in [re.search(r' d="([^"]*)"', e)]
        if m
    }

    def repaint(m: re.Match) -> str:
        value = m.group(1)
        ref = re.match(r"url\(#([^)]+)\)", value)
        if ref:
            return f' fill="{KNOCKOUT}"' if ref.group(1) in light else ""
        if value.startswith("#") and luminance(value) > 0.75:
            return f' fill="{KNOCKOUT}"'
        return ""

    kept = []
    for e in elements:
        if FULL_RECT in e or "fill-opacity" in e:
            continue
        d = re.search(r' d="([^"]*)"', e)
        if d and d.group(1) in overlay_ds:
            continue  # the gradient background under an overlay
        kept.append(re.sub(r' fill="([^"]*)"', repaint, e))
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">'
        + "".join(kept)
        + "</svg>\n"
    )


if __name__ == "__main__":
    count = 0
    for source in sorted(HERE.glob("*.svg")):
        if source.stem.endswith("-outline") or source.stem in HAND_MADE:
            continue
        target = HERE / f"{source.stem}-outline.svg"
        outline = derive(source.read_text(encoding="utf-8"))
        target.write_text(outline, encoding="utf-8", newline="\n")
        count += 1
    print(f"derived {count} outline icons")
