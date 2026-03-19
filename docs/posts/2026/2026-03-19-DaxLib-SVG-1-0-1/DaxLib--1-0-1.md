---
title: DaxLib.SVG 1.0.1
description: DaxLib.SVG v1.0.1 release
image: /assets/images/blog/2026/2026-03-19-DaxLib-SVG-1-0-1/daxlib-svg.png
date:
  created: 2026-03-19
authors:
  - jDuddy
comments: true
categories:
  - DAX Lib
links:
  - daxlib.svg Package: https://daxlib.org/package/DaxLib.SVG
  - daxlib.svg Docs: https://evaluationcontext.github.io/daxlib.svg/
slug: posts/DAXLibSVG-1-0-1
---

I am happy to announce the release of `DaxLib.SVG v1.0.1`. `DaxLib.SVG` is a DAX UDF library designed to help make creating SVGs in Power BI easier for everyone. The bump to `v1.x` is due to API changes to `DaxLib.SVG.Compound.*` functions. This update brings axes and min/max markers to some `DaxLib.SVG.Compound.*`. Not to mention and a new `DaxLib.SVG.Viz.*` layer on top of `DaxLib.SVG.Compound.*` to make the library even easier to use.

[:material-book-open: Docs](https://evaluationcontext.github.io/daxlib.svg/){ .md-button }
[:material-package-variant: Package](https://daxlib.org/package/daxlib.svg/){ .md-button }

## Changes

There are some breaking changes from `v0.2.3-beta` to enable some additional functionality. The `DaxLib.SVG.Compound.*` functions have had their API updated and new function categories have been added.

### New Function Categories

Three new function categories have been introduced to support the axis system and encapsulate common data processing:

| Category | Functions | Description |
|----------|-----------|-------------|
| `DaxLib.SVG.Data.*` | `AxisMeasure`, `Range` | Shared data helpers for building axis/value tables and computing ranges |
| `DaxLib.SVG.Axes.*` | `Layout`, `Point`, `Baseline`, `Render`, `MaxTickLabelWidth` | Axis layout, rendering, point mapping, and baseline computation |
| `DaxLib.SVG.Viz.*` | `Bars`, `Line`, `Area`, `Heatmap`, `Jitter`, `Boxplot`, `Violin`, `Pill`, `ProgressBar` | Minimal wrapper functions with sensible defaults |

Additionally, two new scale functions have been added: `#!dax DaxLib.SVG.Scale.NiceRange` and `#!dax DaxLib.SVG.Scale.NiceNum` which are used by the axis system.

### DaxLib.SVG.Viz

First off, a new `DaxLib.SVG.Viz.*` function layer has been added. These are thin wrappers around the `Compound.*` functions that provide sensible defaults and wrap the output in the `#!dax DaxLib.SVG.SVG()` container, making them easier to use for common cases.

All `Viz.*` functions default to `120×48` pixels and use `DaxLib.SVG.Color.Theme( "Power BI", 1 )` as the default color. They simplify the signature by removing positional parameters (`x`, `y`, `paddingX`, `paddingY`) and wrapping the result in an SVG container.

For example, instead of writing:

```dax title="Using Compound"
VAR _Marks =
    DaxLib.SVG.Compound.Bars(
        0, 0, 120, 48,
        0, 0,
        'Date'[YearMonth],
        [Total Sales],
        "#01B8AA",
        BLANK(), BLANK(),
        FALSE(), BLANK()
    )
RETURN
    DaxLib.SVG.SVG( "100%", "100%", "0 0 120 48", _Marks, BLANK() )
```

You can write:

```dax title="Using Viz"
DaxLib.SVG.Viz.Bars(
    'Date'[YearMonth],
    [Total Sales],
    "#01B8AA",
    BLANK(), BLANK(),
    FALSE(),
    BLANK(), BLANK()
)
```

The `Compound.*` functions remain available for when you need full control over positioning, padding, and composition within larger SVG layouts.

### Compounds

The `DaxLib.SVG.Compound.*` functions have been updated with new parameters to support axes and/or orientation. `DaxLib.SVG.Compound.Bar` has also been renamed to `DaxLib.SVG.Compound.Bars`.

??? example "DaxLib.SVG.Compound.Bars (previously DaxLib.SVG.Compound.Bar)"

    **v0.2.3-beta** — 9 parameters:

    ```dax
    DaxLib.SVG.Compound.Bar(
        x, 
        y, 
        width, 
        height,
        paddingX, 
        paddingY,
        axisRef, 
        measureRef,
        barColor
    )
    ```

    **v1.0.1** — 13 parameters:

    ```dax
    DaxLib.SVG.Compound.Bars(
        x, 
        y, 
        width, 
        height,
        paddingX, 
        paddingY,
        axisRef, 
        measureRef,
        barColor,
        minMarkColor,   -- NEW: Hex color for the minimum value bar
        maxMarkColor,   -- NEW: Hex color for the maximum value bar
        showAxis,       -- NEW: Show axes when TRUE
        axisFontSize    -- NEW: Axis label font size
    )
    ```

??? example "DaxLib.SVG.Compound.Line"

    **v0.2.3-beta** — 9 parameters:

    ```dax
    DaxLib.SVG.Compound.Line(
        x, 
        y, 
        width, 
        height,
        paddingX, 
        paddingY,
        axisRef, 
        measureRef,
        lineColor
    )
    ```

    **v1.0.1** — 13 parameters:

    ```dax
    DaxLib.SVG.Compound.Line(
        x, 
        y, 
        width, 
        height,
        paddingX, 
        paddingY,
        axisRef, 
        measureRef,
        lineColor,
        minMarkColor,   -- NEW: Hex color for the minimum value marker
        maxMarkColor,   -- NEW: Hex color for the maximum value marker
        showAxis,       -- NEW: Show axes when TRUE
        axisFontSize    -- NEW: Axis label font size
    )
    ```

??? example "DaxLib.SVG.Compound.Area"

    **v0.2.3-beta** — 11 parameters:

    ```dax
    DaxLib.SVG.Compound.Area(
        x, 
        y, 
        width, 
        height,
        paddingX, 
        paddingY,
        axisRef, 
        measureRef,
        fillColor, 
        fillOpacity, 
        strokeColor
    )
    ```

    **v1.0.1** — 15 parameters:

    ```dax
    DaxLib.SVG.Compound.Area(
        x, 
        y, 
        width, 
        height,
        paddingX,
        paddingY,
        axisRef, 
        measureRef,
        fillColor, 
        fillOpacity, 
        strokeColor,
        minMarkColor,   -- NEW: Hex color for the minimum value marker
        maxMarkColor,   -- NEW: Hex color for the maximum value marker
        showAxis,       -- NEW: Show axes when TRUE
        axisFontSize    -- NEW: Axis label font size
    )
    ```

??? example "DaxLib.SVG.Compound.Boxplot"

    **v0.2.3-beta** — 11 parameters:

    ```dax
    DaxLib.SVG.Compound.Boxplot(
        x, 
        y, 
        width, 
        height,
        paddingX, 
        paddingY,
        axisRef, 
        measureRef,
        fillColor, 
        strokeColor, 
        showOutliers
    )
    ```

    **v1.0.1** — 12 parameters:

    ```dax
    DaxLib.SVG.Compound.Boxplot(
        x, 
        y, 
        width, 
        height,
        paddingX, 
        paddingY,
        axisRef, 
        measureRef,
        fillColor, 
        strokeColor, 
        showOutliers,
        orientation     -- NEW: "Horizontal" (default) or "Vertical"
    )
    ```

??? example "DaxLib.SVG.Compound.Violin"

    **v0.2.3-beta** — 11 parameters:

    ```dax
    DaxLib.SVG.Compound.Violin(
        x, 
        y, 
        width, 
        height,
        paddingX, 
        paddingY,
        axisRef, 
        measureRef,
        samples, 
        bandwidth, 
        color
    )
    ```

    **v1.0.1** — 12 parameters:

    ```dax
    DaxLib.SVG.Compound.Violin(
        x, 
        y, 
        width, 
        height,
        paddingX, 
        paddingY,
        axisRef, 
        measureRef,
        samples, 
        bandwidth, 
        color,
        orientation     -- NEW: "Horizontal" (default) or "Vertical"
    )
    ```


#### DaxLib.SVG.Compound.ProgressBar

A new compound function `DaxLib.SVG.Compound.ProgressBar` has also been added.

=== "Example"

    <svg width='500' height='50' xmlns='http://www.w3.org/2000/svg'><rect x='12.5' y='0.5' width='475' height='49' rx='3' ry='3' fill='#E1DFDD' fill-opacity='1' stroke='#E1DFDD' stroke-width='1'  /><rect x='12.5' y='0.5' width='380' height='49' rx='3' ry='3' fill='#E044A7' fill-opacity='0.95' stroke='#E044A7' stroke-width='1'  /></svg>

=== "Code"

    ```dax
    DaxLib.SVG.Compound.ProgressBar(
        0,                  // x
        0,                  // y
        500,                // width
        100,                // height
        0.02,               // paddingX
        0.05,               // paddingY
        [Completed],        // valueRef
        [Target],           // trackRef
        "#EC008C",          // fillColor
        "#E1DFDD",          // trackColor
        "Horizontal"        // orientation
    )
    ```

#### Orientation

`DaxLib.SVG.Compound.Boxplot`, `DaxLib.SVG.Compound.Violin`, and `DaxLib.SVG.Compound.ProgressBar` now accept an `orientation` parameter. The value is a string — either `#!dax "Horizontal"` (default) or `#!dax "Vertical"`.

Orientation is passed through to `#!dax DaxLib.SVG.Axes.Point` internally, so all coordinate mapping is handled automatically — no additional changes are needed beyond setting the parameter.

#### Axis

A new axis system has been introduced to `DaxLib.SVG.Compound.Bars`, `DaxLib.SVG.Compound.Line`, and `DaxLib.SVG.Compound.Area`. These now accept `showAxis` and `axisFontSize` parameters. When `showAxis` is set to `TRUE`, the compound renders axis lines, ticks, and labels.

??? info "Axis Helper Functions"

    The axis system is built from several new helper functions:

    - `#!dax DaxLib.SVG.Axes.Layout` — Calculates axis-aware plot area bounds, reserving space for tick labels and axis lines
    - `#!dax DaxLib.SVG.Axes.Point` — Maps axis/value data to plot coordinates, honoring orientation (`"Horizontal"` or `"Vertical"`)
    - `#!dax DaxLib.SVG.Axes.Baseline` — Computes the zero-line position in plot coordinates
    - `#!dax DaxLib.SVG.Axes.Render` — Renders the axis lines, tick marks, and labels with overlap detection
    - `#!dax DaxLib.SVG.Axes.MaxTickLabelWidth` — Estimates the maximum tick label width for layout reservation

    These functions work together: `Layout` reserves space → `Point` maps data coordinates → `Baseline` computes the zero line → `Render` draws the visual axis elements.

=== "Example"

    <svg width='500' height='200' xmlns='http://www.w3.org/2000/svg' style='background:white'><rect x='49.0882580645161' y='166.54607' width='5.66606451612903' height='12.45393' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='56.1708387096774' y='173.9726' width='5.66606451612903' height='5.0274' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='63.2534193548387' y='177.95861' width='5.66606451612903' height='1.04139000000001' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='70.336' y='165.35933' width='5.66606451612903' height='13.64067' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='77.4185806451613' y='100.7333' width='5.66606451612903' height='78.2667' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='84.5011612903226' y='175.6484' width='5.66606451612903' height='3.35159999999999' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='91.5837419354839' y='107.461295' width='5.66606451612903' height='71.538705' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='98.6663225806452' y='176.695775' width='5.66606451612903' height='2.304225' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='105.748903225806' y='99.656' width='5.66606451612903' height='79.344' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='112.831483870968' y='160.34903' width='5.66606451612903' height='18.65097' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='119.914064516129' y='168.95546' width='5.66606451612903' height='10.04454' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='126.99664516129' y='176.543585' width='5.66606451612903' height='2.45641499999999' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='134.079225806452' y='111.2498' width='5.66606451612903' height='67.7502' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='141.161806451613' y='156.43655' width='5.66606451612903' height='22.56345' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='148.244387096774' y='157.95503' width='5.66606451612903' height='21.04497' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='155.326967741935' y='138.99284' width='5.66606451612903' height='40.00716' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='162.409548387097' y='173.8016' width='5.66606451612903' height='5.19839999999999' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='169.492129032258' y='136.08242' width='5.66606451612903' height='42.91758' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='176.574709677419' y='162.365975' width='5.66606451612903' height='16.634025' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='183.657290322581' y='134.1638' width='5.66606451612903' height='44.8362' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='190.739870967742' y='162.145385' width='5.66606451612903' height='16.854615' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='197.822451612903' y='154.45979' width='5.66606451612903' height='24.54021' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='204.905032258065' y='158.651' width='5.66606451612903' height='20.349' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='211.987612903226' y='47.83274' width='5.66606451612903' height='131.16726' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='219.070193548387' y='172.40453' width='5.66606451612903' height='6.59547000000001' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='226.152774193548' y='165.90824' width='5.66606451612903' height='13.09176' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='233.23535483871' y='142.258085' width='5.66606451612903' height='36.741915' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='240.317935483871' y='126.332' width='5.66606451612903' height='52.668' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='247.400516129032' y='174.09059' width='5.66606451612903' height='4.90941000000001' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='254.483096774194' y='121.30118' width='5.66606451612903' height='57.69882' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='261.565677419355' y='155.59865' width='5.66606451612903' height='23.40135' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='268.648258064516' y='150.84656' width='5.66606451612903' height='28.15344' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='275.730838709677' y='156.57848' width='5.66606451612903' height='22.42152' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='282.813419354839' y='161.4041' width='5.66606451612903' height='17.5959' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='289.896' y='101.42072' width='5.66606451612903' height='77.57928' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='296.978580645161' y='175.355135' width='5.66606451612903' height='3.64486500000001' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='304.061161290323' y='178.68023' width='5.66606451612903' height='0.319770000000005' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='311.143741935484' y='170.744975' width='5.66606451612903' height='8.25502499999999' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='318.226322580645' y='107.55791' width='5.66606451612903' height='71.44209' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='325.308903225806' y='171.16478' width='5.66606451612903' height='7.83521999999999' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='332.391483870968' y='172.61486' width='5.66606451612903' height='6.38514000000001' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='339.474064516129' y='167.201' width='5.66606451612903' height='11.799' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='346.55664516129' y='167.372' width='5.66606451612903' height='11.628' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='353.639225806452' y='155.97143' width='5.66606451612903' height='23.02857' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='360.721806451613' y='167.20955' width='5.66606451612903' height='11.79045' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='367.804387096774' y='178.6238' width='5.66606451612903' height='0.376200000000011' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='374.886967741936' y='168.829775' width='5.66606451612903' height='10.170225' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='381.969548387097' y='155.15918' width='5.66606451612903' height='23.84082' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='389.052129032258' y='144.95732' width='5.66606451612903' height='34.04268' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='396.134709677419' y='154.29392' width='5.66606451612903' height='24.70608' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='403.217290322581' y='172.877345' width='5.66606451612903' height='6.12265500000001' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='410.299870967742' y='63.84005' width='5.66606451612903' height='115.15995' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='417.382451612903' y='10.43504' width='5.66606451612903' height='168.56496' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='424.465032258065' y='110.81888' width='5.66606451612903' height='68.18112' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='431.547612903226' y='170.51327' width='5.66606451612903' height='8.48672999999999' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='438.630193548387' y='170.7407' width='5.66606451612903' height='8.2593' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='445.712774193548' y='94.39775' width='5.66606451612903' height='84.60225' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='452.79535483871' y='97.30988' width='5.66606451612903' height='81.69012' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='459.877935483871' y='174.84299' width='5.66606451612903' height='4.15701000000001' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='466.960516129032' y='121.1849' width='5.66606451612903' height='57.8151' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='474.043096774194' y='145.2617' width='5.66606451612903' height='33.7383' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /> <rect x='481.125677419355' y='155.45843' width='5.66606451612903' height='23.54157' rx='0' ry='0' fill='#E044A7' stroke-width='1'  /><line x1='48.38' y1='179' x2='487.5' y2='179' stroke='#605E5C' stroke-width='1'  /><line x1='48.38' y1='8' x2='48.38' y2='179' stroke='#605E5C' stroke-width='1'  /><line x1='48.38' y1='179' x2='48.38' y2='182' stroke='#605E5C' stroke-width='1'  /><text x='48.38' y='186' fill='#605E5C' font-family='Segoe UI' font-size='8' text-anchor='start' dominant-baseline='hanging'  >01-Aug-25</text><line x1='158.16' y1='179' x2='158.16' y2='182' stroke='#605E5C' stroke-width='1'  /><text x='158.16' y='186' fill='#605E5C' font-family='Segoe UI' font-size='8' text-anchor='middle' dominant-baseline='hanging'  >16-Aug-25</text><line x1='267.94' y1='179' x2='267.94' y2='182' stroke='#605E5C' stroke-width='1'  /><text x='267.94' y='186' fill='#605E5C' font-family='Segoe UI' font-size='8' text-anchor='middle' dominant-baseline='hanging'  >31-Aug-25</text><line x1='377.72' y1='179' x2='377.72' y2='182' stroke='#605E5C' stroke-width='1'  /><text x='377.72' y='186' fill='#605E5C' font-family='Segoe UI' font-size='8' text-anchor='middle' dominant-baseline='hanging'  >15-Sep-25</text><line x1='487.5' y1='179' x2='487.5' y2='182' stroke='#605E5C' stroke-width='1'  /><text x='487.5' y='186' fill='#605E5C' font-family='Segoe UI' font-size='8' text-anchor='end' dominant-baseline='hanging'  >01-Oct-25</text><line x1='45.38' y1='179' x2='48.38' y2='179' stroke='#605E5C' stroke-width='1'  /><text x='41.38' y='179' fill='#605E5C' font-family='Segoe UI' font-size='8' text-anchor='end' dominant-baseline='middle'  >0</text><line x1='45.38' y1='144.8' x2='48.38' y2='144.8' stroke='#605E5C' stroke-width='1'  /><text x='41.38' y='144.8' fill='#605E5C' font-family='Segoe UI' font-size='8' text-anchor='end' dominant-baseline='middle'  >20000</text><line x1='45.38' y1='110.6' x2='48.38' y2='110.6' stroke='#605E5C' stroke-width='1'  /><text x='41.38' y='110.6' fill='#605E5C' font-family='Segoe UI' font-size='8' text-anchor='end' dominant-baseline='middle'  >40000</text><line x1='45.38' y1='76.4' x2='48.38' y2='76.4' stroke='#605E5C' stroke-width='1'  /><text x='41.38' y='76.4' fill='#605E5C' font-family='Segoe UI' font-size='8' text-anchor='end' dominant-baseline='middle'  >60000</text><line x1='45.38' y1='42.2' x2='48.38' y2='42.2' stroke='#605E5C' stroke-width='1'  /><text x='41.38' y='42.2' fill='#605E5C' font-family='Segoe UI' font-size='8' text-anchor='end' dominant-baseline='middle'  >80000</text><line x1='45.38' y1='8' x2='48.38' y2='8' stroke='#605E5C' stroke-width='1'  /><text x='41.38' y='8' fill='#605E5C' font-family='Segoe UI' font-size='8' text-anchor='end' dominant-baseline='middle'  > 100000</text></svg>

=== "Code"

    ```dax hl_lines="8-9"
    DaxLib.SVG.Compound.Bars(
        0, 0, 500, 200,         // x, y, width, height
        0, 0,                   // paddingX, paddingY
        'Date'[YearMonth],      // axisRef
        [Total Sales],          // measureRef
        "#E044A7",              // barColor
        BLANK(), BLANK(),       // minMarkColor, maxMarkColor
        TRUE(),                 // showAxis
        10                      // axisFontSize
    )
    ```

#### Min/Max Markers

The `DaxLib.SVG.Compound.Bars`, `DaxLib.SVG.Compound.Line`, and `DaxLib.SVG.Compound.Area` functions now support optional min/max markers to highlight the minimum and maximum values in the series. The marker behavior differs by chart type:

**Line & Area** — Circle markers with a white halo (`r=3.5`) and a colored dot (`r=2.5`). Markers only appear when there are more than 2 data points and the respective color parameter is not blank.

**Bars** — The minimum and maximum value bars are colored rather than adding separate marker elements. This keeps the SVG output compact.

=== "Example"

    <svg width='500' height='200' xmlns='http://www.w3.org/2000/svg' style='background:white'><polyline points='12.5,176.8906 20.2868852459016,184.708 28.0737704918033,188.9038 35.8606557377049,175.6414 43.6475409836066,107.614 51.4344262295082,186.472 59.2213114754098,114.6961 67.0081967213115,187.5745 74.7950819672131,106.48 82.5819672131148,170.3674 90.3688524590164,179.4268 98.155737704918,187.4143 105.94262295082,118.684 113.729508196721,166.249 121.516393442623,167.8474 129.303278688525,147.8872 137.090163934426,184.528 144.877049180328,144.8236 152.66393442623,172.4905 160.450819672131,142.804 168.237704918033,172.2583 176.024590163934,164.1682 183.811475409836,168.58 191.598360655738,51.9292 199.385245901639,183.0574 207.172131147541,176.2192 214.959016393443,151.3243 222.745901639344,134.56 230.532786885246,184.8322 238.319672131148,129.2644 246.106557377049,165.367 253.893442622951,160.3648 261.680327868852,166.3984 269.467213114754,171.478 277.254098360656,108.3376 285.040983606557,186.1633 292.827868852459,189.6634 300.614754098361,181.3105 308.401639344262,114.7978 316.188524590164,181.7524 323.975409836066,183.2788 331.762295081967,177.58 339.549180327869,177.76 347.33606557377,165.7594 355.122950819672,177.589 362.909836065574,189.604 370.696721311475,179.2945 378.483606557377,164.9044 386.270491803279,154.1656 394.05737704918,163.9936 401.844262295082,183.5551 409.631147540984,68.779 417.418032786885,12.5632 425.204918032787,118.2304 432.991803278689,181.0666 440.77868852459,181.306 448.565573770492,100.945 456.352459016393,104.0104 464.139344262295,185.6242 471.926229508197,129.142 479.713114754098,154.486 487.5,165.2194' fill='none' stroke='#E044A7' stroke-width='1'  /><circle cx='292.827868852459' cy='189.6634' r='3.5' fill='white' fill-opacity='0.7'  /><circle cx='292.827868852459' cy='189.6634' r='2.5' fill='#D04848'  /><circle cx='417.418032786885' cy='12.5632' r='3.5' fill='white' fill-opacity='0.7'  /><circle cx='417.418032786885' cy='12.5632' r='2.5' fill='#2E8B57'  /></svg>

=== "Code"

    ```dax hl_lines="7-8"
    DaxLib.SVG.Compound.Line(
        0, 0, 500, 200,         // x, y, width, height
        0, 0,                   // paddingX, paddingY
        'Date'[Date],           // axisRef
        [Total Sales],          // measureRef
        "#E044A7",              // lineColor
        "#D04848",              // minMarkColor (red for minimum)
        "#2E8B57",              // maxMarkColor (green for maximum)
        FALSE(),                // showAxis
        BLANK()                 // axisFontSize
    )
    ```