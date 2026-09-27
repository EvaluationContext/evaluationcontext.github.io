# Post template and mkdocs-material conventions

The blog is Material for MkDocs with the blog plugin. Posts live at `docs/posts/<YYYY>/<YYYY-MM-DD-ShortName>/<ShortName>.md` with images in the same folder, referenced relatively (`![Alt](image.png)`). The hero image in front matter uses the absolute path under `/assets/images/blog/...`.

## Front matter

Copy this block and fill it in. Field order matters only for consistency.

```yaml
---
title: Short Noun Phrase In Title Case
description: One line, no full stop, says what the post does
image: /assets/images/blog/2025/2025-02-19-ShortName/hero.png
date:
  created: 2025-02-19
authors:
  - jDuddy
comments: true
categories:
  - SVG
links:
  - Title of related post: https://evaluationcontext.com/posts/related-slug/
slug: posts/short-name
---
```

Notes:

- `description` is a plain noun phrase: "Using DAX to create a SVG Dumbbell chart in Power BI", "Optimizing the SVG Heatmap using the Sparkline measure pattern". It often mirrors the title. No colons, no marketing.
- One category per post. Existing categories: SVG, DAX, DAX Lib, CICD, SSAS Tabular, Data Modelling, Administration, Graphs, Deneb, Vega, Lakehouse, PBIP, VS Code, Real-Time Intelligence, Translytical Task Flow, Logging, Fabric App, AI, Blogging, Syntax Highlighting. Reuse before inventing.
- `links` is optional. Use it for the previous post in a series or the docs and package pages a post depends on.
- `date.updated` is added later when a post is revised; do not add it on first publish.

## Body skeleton

There is no fixed template, but nearly every post falls out as:

```markdown
Opening paragraph(s): the situation, who or what prompted it, the problem. No heading. Two to five sentences before the first `##`.

## Background Concept
Short explanation of the thing the reader needs to know, with links to the canonical source. Quote docs in a `!!! quote` admonition if quoting.

## The Build
Prose sentence -> code or image -> one or two sentences on what it shows. Repeat. Use `=== "Visual"` / `=== "Code"` tabs for the finished visual.

## Performance   (or Results, Comparison, Implementing)
Before/after tabs of Server Timings or screenshots. State the numbers plainly.

## Conclusion
Two to five sentences. Trade-off, principle, what is unfinished, what next.
```

Headings are `##` for sections, `###` for sub-steps. Title Case, short nouns: "Semantic Model", "Measure Comparison", "Heatmap SVG", "Script to Donate Theme", "Proof of Concept", "Next Steps". Not questions, not verbs, not "Why This Matters".

## Features used in the posts

### Tabs (signature device)

Pair the visual with the code that made it. Indent the contents by four spaces.

```markdown
=== "Visual"

    ![SVG Violin Plot](SVGViolin_Large.png)

=== "Code"

    ```dax
    Command Duration Violin SVG =
    VAR _SvgWidth = 150
    ...
    ```
```

Also used for before/after comparisons (`=== "Old Performance"` / `=== "New Performance"`), alternative implementations (`=== "TOPN"` / `=== "INDEX"`), and parameter variants (`=== "RangeStart"` / `=== "RangeEnd"`).

### Admonitions

```markdown
!!! quote "Microsoft Docs: Run metadata scanning"

    Quoted text verbatim.
    -- <cite>[Microsoft Docs: Run metadata scanning](https://learn.microsoft.com/...)</cite>

!!! info "Partition Size"

    A short aside the reader can skip.

!!! tip "Clear Cache"

    A practical hint.

!!! warning

    Something that bit the author.
```

`quote` for docs, Kimball, package READMEs. `info` for asides and caveats. `tip` for hints. `warning` for gotchas and apologies. Titles are optional and short. Use collapsible `???` blocks for long specs or optional detail the reader can skip; `!!!` for anything they should read.

### Inline highlighted code

`#!dax GENERATESERIES()`, `#!python True`, `#!xml <use>`, `#!json "order"`. Used whenever a function, element or literal is named mid-sentence. Plain backticks for identifiers, file names, parameter names: `RangeStart`, `report.json`, `[@Islands]`.

### Image with a source line

```markdown
![Parquet Structure](parquet.png)
<cite>[Parquet Structure](https://www.youtube.com/watch?v=...)</cite>
```

### Folder trees as diff blocks

```markdown
```diff
 📁 Recipient
 ├── 📁 recipient.Report
+├── 📁 Donor
+│   ├── 📁 donor.Report
+├ .gitmodules
 └ .gitignore
```
```

The `+`/`-` prefixes show what changed at each step. Emoji appear here and nowhere else.

### Tables

Reference data and concise comparisons: API endpoints and what they return, extension IDs, required scopes, lakehouse components, item types supported per version. Not a substitute for a paragraph of reasoning, and not a closing "summary table" of what the post already said.

### Icons and buttons

Material icons are available anywhere in the body and are fine as bullet prefixes or table cells:

```markdown
- :material-check: Supported
- :material-close: Not supported
- :octicons-repo-24: [Repo](https://github.com/...)

[:material-book-open: Docs](https://...){ .md-button }
[:material-package-variant: Package](https://...){ .md-button }
```

Icon names come from the Material for MkDocs icon search (`material/`, `octicons/`, `fontawesome/`, `simple/`).

### Rendered Vega

````markdown
```vegalite
{ "$schema": "https://vega.github.io/schema/vega-lite/v5.json", ... }
```
````

Renders interactively via vega-embed. Pair with a `=== "Code"` tab holding the same spec as `json` so readers can copy it.

### Code fence languages

`dax` (dominant), `python`, `sql`, `fsharp` (for Power Query M), `powershell`, `bash`, `json`, `yaml`, `xml`, `html`, `diff`, `plaintext`, `c#`. Language tag on every fence.

## DAX formatting inside code blocks

- `VAR _name =` with values aligned in a column where there are many variables, `__name` for variables borrowed from Power BI's own generated queries.
- Leading commas on continuation lines inside function calls.
- `// comments` explain intent and carry source URLs (`// https://dax.tips/2019/10/02/dax-base-conversions/`).
- `RETURN` on its own line, result expression below.
- Section comments in longer measures: `// Values`, `// Colours`, `// Vectors`.

## Release-notes posts (DaxLib.SVG, fabric-cicd)

Same plain voice, fixed shape:

1. One paragraph: what was released, one sentence on what it brings.
2. `.md-button` links to docs and package.
3. `## Changes` with a `###` per change. A sentence on why, then before/after code (`title="v1.x"` / `title="v2.0.0"` fences, or a `??? example` collapsible when long). An icon-prefixed summary list at the top of `## Changes` is fine when there are many changes (`:material-alert-outline:` breaking, `:octicons-sparkles-fill-16:` new, `:material-bug-outline:` fix).
4. Credit anyone who raised an issue, linking the issue.
5. One or two sentences at the end: known gaps, ask for bug reports.
