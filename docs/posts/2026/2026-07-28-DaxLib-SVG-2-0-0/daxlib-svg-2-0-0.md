---
title: DaxLib.SVG 2.0.0
description: DaxLib.SVG v2.0.0 release
image: /assets/images/blog/2026/2026-03-19-DaxLib-SVG-1-0-1/daxlib-svg.png
date:
  created: 2026-07-28
authors:
  - jDuddy
comments: true
categories:
  - DAX Lib
links:
  - daxlib.svg Package: https://daxlib.org/package/DaxLib.SVG
  - daxlib.svg Docs: https://evaluationcontext.github.io/daxlib.svg/
slug: posts/DAXLib-SVG-2-0-0
---

DAX UDFs are [Generally Available](https://community.fabric.microsoft.com/t5/Power-BI-Updates-Blog/DAX-User-Defined-Functions-Generally-Available/ba-p/5185738), and they bring optional parameters with the release. DAXLib.SVG `v2.0.0` brings the  [DAX UDF optional parameters](https://www.sqlbi.com/articles/optional-parameters-in-dax-user-defined-functions/) to the library, so you no longer need to pad function calls with `#!dax BLANK()`. Optional parameters let you skip anything you don't care about and fall back on sensible defaults, making function calls far less verbose.

[:material-book-open: Docs](https://evaluationcontext.github.io/daxlib.svg/){ .md-button }
[:material-package-variant: Package](https://daxlib.org/package/daxlib.svg/){ .md-button }

## Changes

### Summary

:material-alert-outline: Some incompatible API changes: optional parameters have been reordered to trail required parameters in `#!dax DaxLib.SVG.Compound.*` and `#!dax DaxLib.SVG.Axes.Layout()`

:octicons-sparkles-fill-16: Optional parameters with default values in all UDFs, leveraging the new [DAX UDF optional parameter syntax](https://www.sqlbi.com/articles/optional-parameters-in-dax-user-defined-functions/)

:octicons-sparkles-fill-16: `#!dax DaxLib.SVG.Compound.Bars()` aligned with the native Power BI bar chart

:material-bug-outline: Resolves [EvaluationContext/daxlib.svg#4](https://github.com/EvaluationContext/daxlib.svg/issues/4)

### Optional Parameters

The headline change is that every UDF in `DaxLib.SVG` now takes advantage of the new [DAX UDF optional parameter syntax](https://www.sqlbi.com/articles/optional-parameters-in-dax-user-defined-functions/). Parameters that used to require an explicit `#!dax BLANK()` now have real defaults, so you only need to pass the values you actually care about.

For example, a minimal bar chart in `v1.x` looked like this:

```dax title="v1.x"
DaxLib.SVG.Viz.Bars(
    'Date'[YearMonth],
    [Total Sales],
    "#01B8AA",
    BLANK(), BLANK(),
    FALSE(),
    BLANK(), BLANK()
)
```

In `v2.0.0` the same call collapses down to just the required arguments:

```dax title="v2.0.0"
DaxLib.SVG.Viz.Bars(
    'Date'[YearMonth],
    [Total Sales]
)
```

### API Reordering (Breaking)

To take advantage of optional parameters, they must trail all required parameters. As a result the parameter order has changed for `#!dax DaxLib.SVG.Compound.*` and `#!dax DaxLib.SVG.Axes.Layout()`. If you are upgrading from `v1.x` and were passing positional arguments beyond the required set, you will need to review your calls against the [updated docs](https://evaluationcontext.github.io/daxlib.svg/).

### Bars Aligned With Native Power BI

`#!dax DaxLib.SVG.Compound.Bars()` has been reworked so its bar sizing, spacing, and baseline behaviour align with the native Power BI bar/column chart. Bars rendered inline in a table or matrix now match the shape you'd get from a matching native visual, which makes mixing the two much more consistent.

### XML Escaping in Text ([#4](https://github.com/EvaluationContext/daxlib.svg/issues/4))

Thanks to [@IaMth3CodaDJ](https://github.com/IaMth3CodaDJ) for raising [#4](https://github.com/EvaluationContext/daxlib.svg/issues/4). Text passed to `#!dax DaxLib.SVG.Elements.Txt()` (and related helpers) is now XML-escaped by default, so characters like `&`, `<`, and `>` no longer silently break the SVG. Escaping can be turned off via an optional parameter for the rare case where you want to inject raw markup.

## Bugs?

The move to optional parameters touches every UDF in the library. I've done my best to verify the functions and keep the documentation in sync, but if anything has slipped through the cracks please let me know.

[:octicons-mark-github-16: Report a library issue](https://github.com/daxlib/dev-daxlib-svg/issues/new){ .md-button }
[:octicons-mark-github-16: Report a docs issue](https://github.com/EvaluationContext/daxlib.svg/issues/new){ .md-button }