DAX UDFs are [Generally Available](<https://community.fabric.microsoft.com/t5/Power-BI-Updates-Blog/DAX-User-Defined-Functions-Generally-Available/ba-p/5185738>), and they bring optional parameters with the release. DAXLib.SVG `v2.0.0` brings the [DAX UDF optional parameters](<https://www.sqlbi.com/articles/optional-parameters-in-dax-user-defined-functions/>) to the library, so you no longer need to pad function calls with `BLANK()`. Optional parameters let you skip anything you don't care about and fall back on sensible defaults, making function calls far less verbose.

## Changes

### Summary

Some incompatible API changes: optional parameters have been reordered to trail required parameters in `DaxLib.SVG.Compound.*` and `DaxLib.SVG.Axes.Layout()`

Optional parameters with default values in all UDFs, leveraging the new [DAX UDF optional parameter syntax](<https://www.sqlbi.com/articles/optional-parameters-in-dax-user-defined-functions/>)

`DaxLib.SVG.Compound.Bars()` aligned with the native Power BI bar chart

Resolves [EvaluationContext/daxlib.svg\#4](<https://github.com/EvaluationContext/daxlib.svg/issues/4>)

### Optional Parameters

The headline change is that every UDF in `DaxLib.SVG` now takes advantage of the new [DAX UDF optional parameter syntax](<https://www.sqlbi.com/articles/optional-parameters-in-dax-user-defined-functions/>). Parameters that used to require an explicit `BLANK()` now have real defaults, so you only need to pass the values you actually care about.

For example, a minimal bar chart in `v1.x` looked like this:

v1.x

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

In `v2.0.0` the same call collapses down to just the required arguments:

v2.0.0

```dax
DaxLib.SVG.Viz.Bars(
    'Date'[YearMonth],
    [Total Sales]
)
```

### API Reordering (Breaking)

To take advantage of optional parameters, they must trail all required parameters. As a result the parameter order has changed for `DaxLib.SVG.Compound.*` and `DaxLib.SVG.Axes.Layout()`. If you are upgrading from `v1.x` and were passing positional arguments beyond the required set, you will need to review your calls against the [updated docs](<https://evaluationcontext.github.io/daxlib.svg/>).

### Bars Aligned With Native Power BI

`DaxLib.SVG.Compound.Bars()` has been reworked so its bar sizing, spacing, and baseline behaviour align with the native Power BI bar/column chart. Bars rendered inline in a table or matrix now match the shape you'd get from a matching native visual, which makes mixing the two much more consistent.

### XML Escaping in Text ([\#4](<https://github.com/EvaluationContext/daxlib.svg/issues/4>))

Thanks to [@IaMth3CodaDJ](<https://github.com/IaMth3CodaDJ>) for raising [\#4](<https://github.com/EvaluationContext/daxlib.svg/issues/4>). Text passed to `DaxLib.SVG.Elements.Txt()` (and related helpers) is now XML-escaped by default, so characters like `&`, `<`, and `>` no longer silently break the SVG. Escaping can be turned off via an optional parameter for the rare case where you want to inject raw markup.

## Bugs?

The move to optional parameters touches every UDF in the library. I've done my best to verify the functions and keep the documentation in sync, but if anything has slipped through the cracks please let me know.
