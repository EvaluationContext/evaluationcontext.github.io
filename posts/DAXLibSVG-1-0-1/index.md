I am happy to announce the release of `DaxLib.SVG v1.0.1`. `DaxLib.SVG` is a DAX UDF library designed to help make creating SVGs in Power BI easier for everyone. The bump to `v1.x` is due to API changes to `DaxLib.SVG.Compound.*` functions. This update brings axes and min/max markers to some `DaxLib.SVG.Compound.*`. Not to mention and a new `DaxLib.SVG.Viz.*` layer on top of `DaxLib.SVG.Compound.*` to make the library even easier to use.

## Changes

There are some breaking changes from `v0.2.3-beta` to enable some additional functionality. The `DaxLib.SVG.Compound.*` functions have had their API updated and new function categories have been added.

### New Function Categories

Three new function categories have been introduced to support the axis system and encapsulate common data processing:

| Category | Functions | Description |
| --- | --- | --- |
| `DaxLib.SVG.Data.*` | `AxisMeasure`, `Range` | Shared data helpers for building axis/value tables and computing ranges |
| `DaxLib.SVG.Axes.*` | `Layout`, `Point`, `Baseline`, `Render`, `MaxTickLabelWidth` | Axis layout, rendering, point mapping, and baseline computation |
| `DaxLib.SVG.Viz.*` | `Bars`, `Line`, `Area`, `Heatmap`, `Jitter`, `Boxplot`, `Violin`, `Pill`, `ProgressBar` | Minimal wrapper functions with sensible defaults |

Additionally, two new scale functions have been added: `DaxLib.SVG.Scale.NiceRange` and `DaxLib.SVG.Scale.NiceNum` which are used by the axis system.

### DaxLib.SVG.Viz

First off, a new `DaxLib.SVG.Viz.*` function layer has been added. These are thin wrappers around the `Compound.*` functions that provide sensible defaults and wrap the output in the `DaxLib.SVG.SVG()` container, making them easier to use for common cases.

All `Viz.*` functions default to `120×48` pixels and use `DaxLib.SVG.Color.Theme( "Power BI", 1 )` as the default color. They simplify the signature by removing positional parameters (`x`, `y`, `paddingX`, `paddingY`) and wrapping the result in an SVG container.

For example, instead of writing:

Using Compound

```dax
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

Using Viz

```dax
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

> [!NOTE]
>
> **DaxLib.SVG.Compound.Bars (previously DaxLib.SVG.Compound.Bar)**
>
> **v0.2.3-beta** — 9 parameters:
>
> ```dax
> DaxLib.SVG.Compound.Bar(
>     x, 
>     y, 
>     width, 
>     height,
>     paddingX, 
>     paddingY,
>     axisRef, 
>     measureRef,
>     barColor
> )
> ```
>
> **v1.0.1** — 13 parameters:
>
> ```dax
> DaxLib.SVG.Compound.Bars(
>     x, 
>     y, 
>     width, 
>     height,
>     paddingX, 
>     paddingY,
>     axisRef, 
>     measureRef,
>     barColor,
>     minMarkColor,   -- NEW: Hex color for the minimum value bar
>     maxMarkColor,   -- NEW: Hex color for the maximum value bar
>     showAxis,       -- NEW: Show axes when TRUE
>     axisFontSize    -- NEW: Axis label font size
> )
> ```

> [!NOTE]
>
> **DaxLib.SVG.Compound.Line**
>
> **v0.2.3-beta** — 9 parameters:
>
> ```dax
> DaxLib.SVG.Compound.Line(
>     x, 
>     y, 
>     width, 
>     height,
>     paddingX, 
>     paddingY,
>     axisRef, 
>     measureRef,
>     lineColor
> )
> ```
>
> **v1.0.1** — 13 parameters:
>
> ```dax
> DaxLib.SVG.Compound.Line(
>     x, 
>     y, 
>     width, 
>     height,
>     paddingX, 
>     paddingY,
>     axisRef, 
>     measureRef,
>     lineColor,
>     minMarkColor,   -- NEW: Hex color for the minimum value marker
>     maxMarkColor,   -- NEW: Hex color for the maximum value marker
>     showAxis,       -- NEW: Show axes when TRUE
>     axisFontSize    -- NEW: Axis label font size
> )
> ```

> [!NOTE]
>
> **DaxLib.SVG.Compound.Area**
>
> **v0.2.3-beta** — 11 parameters:
>
> ```dax
> DaxLib.SVG.Compound.Area(
>     x, 
>     y, 
>     width, 
>     height,
>     paddingX, 
>     paddingY,
>     axisRef, 
>     measureRef,
>     fillColor, 
>     fillOpacity, 
>     strokeColor
> )
> ```
>
> **v1.0.1** — 15 parameters:
>
> ```dax
> DaxLib.SVG.Compound.Area(
>     x, 
>     y, 
>     width, 
>     height,
>     paddingX,
>     paddingY,
>     axisRef, 
>     measureRef,
>     fillColor, 
>     fillOpacity, 
>     strokeColor,
>     minMarkColor,   -- NEW: Hex color for the minimum value marker
>     maxMarkColor,   -- NEW: Hex color for the maximum value marker
>     showAxis,       -- NEW: Show axes when TRUE
>     axisFontSize    -- NEW: Axis label font size
> )
> ```

> [!NOTE]
>
> **DaxLib.SVG.Compound.Boxplot**
>
> **v0.2.3-beta** — 11 parameters:
>
> ```dax
> DaxLib.SVG.Compound.Boxplot(
>     x, 
>     y, 
>     width, 
>     height,
>     paddingX, 
>     paddingY,
>     axisRef, 
>     measureRef,
>     fillColor, 
>     strokeColor, 
>     showOutliers
> )
> ```
>
> **v1.0.1** — 12 parameters:
>
> ```dax
> DaxLib.SVG.Compound.Boxplot(
>     x, 
>     y, 
>     width, 
>     height,
>     paddingX, 
>     paddingY,
>     axisRef, 
>     measureRef,
>     fillColor, 
>     strokeColor, 
>     showOutliers,
>     orientation     -- NEW: "Horizontal" (default) or "Vertical"
> )
> ```

> [!NOTE]
>
> **DaxLib.SVG.Compound.Violin**
>
> **v0.2.3-beta** — 11 parameters:
>
> ```dax
> DaxLib.SVG.Compound.Violin(
>     x, 
>     y, 
>     width, 
>     height,
>     paddingX, 
>     paddingY,
>     axisRef, 
>     measureRef,
>     samples, 
>     bandwidth, 
>     color
> )
> ```
>
> **v1.0.1** — 12 parameters:
>
> ```dax
> DaxLib.SVG.Compound.Violin(
>     x, 
>     y, 
>     width, 
>     height,
>     paddingX, 
>     paddingY,
>     axisRef, 
>     measureRef,
>     samples, 
>     bandwidth, 
>     color,
>     orientation     -- NEW: "Horizontal" (default) or "Vertical"
> )
> ```

#### DaxLib.SVG.Compound.ProgressBar

A new compound function `DaxLib.SVG.Compound.ProgressBar` has also been added.

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

`DaxLib.SVG.Compound.Boxplot`, `DaxLib.SVG.Compound.Violin`, and `DaxLib.SVG.Compound.ProgressBar` now accept an `orientation` parameter. The value is a string — either `"Horizontal"` (default) or `"Vertical"`.

Orientation is passed through to `DaxLib.SVG.Axes.Point` internally, so all coordinate mapping is handled automatically — no additional changes are needed beyond setting the parameter.

#### Axis

A new axis system has been introduced to `DaxLib.SVG.Compound.Bars`, `DaxLib.SVG.Compound.Line`, and `DaxLib.SVG.Compound.Area`. These now accept `showAxis` and `axisFontSize` parameters. When `showAxis` is set to `TRUE`, the compound renders axis lines, ticks, and labels.

> [!NOTE]
>
> **Axis Helper Functions**
>
> The axis system is built from several new helper functions:
>
> - `DaxLib.SVG.Axes.Layout` — Calculates axis-aware plot area bounds, reserving space for tick labels and axis lines
> - `DaxLib.SVG.Axes.Point` — Maps axis/value data to plot coordinates, honoring orientation (`"Horizontal"` or `"Vertical"`)
> - `DaxLib.SVG.Axes.Baseline` — Computes the zero-line position in plot coordinates
> - `DaxLib.SVG.Axes.Render` — Renders the axis lines, tick marks, and labels with overlap detection
> - `DaxLib.SVG.Axes.MaxTickLabelWidth` — Estimates the maximum tick label width for layout reservation
>
> These functions work together: `Layout` reserves space → `Point` maps data coordinates → `Baseline` computes the zero line → `Render` draws the visual axis elements.

```dax
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

**Line &amp; Area** — Circle markers with a white halo (`r=3.5`) and a colored dot (`r=2.5`). Markers only appear when there are more than 2 data points and the respective color parameter is not blank.

**Bars** — The minimum and maximum value bars are colored rather than adding separate marker elements. This keeps the SVG output compact.

```dax
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
