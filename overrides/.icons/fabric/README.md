Fabric item icons from `@fabric-msft/svg-icons` 6.1.0 (MIT, Microsoft Corporation; the licence is beside them), the 24px `item` variants renamed to the item's name, with `viewBox` in place of a fixed size so they scale to the text.

Two forms of each, used in the docs as an icon shortcode:

- `:fabric-<name>:` is the coloured item icon as the portal draws it, for where the item is the subject.
- `:fabric-<name>-outline:` is a monochrome version in the text colour, like a Material icon, for running text.

Two more from the same package that are not items: `:fabric-workspace:` (`group_workspace_24_non-item.svg`) and `:fabric-fabric:` (`fabric_24_color.svg` as `fabric.svg`, the Fabric mark; its outline is the package's own `fabric_24_regular.svg`, so `derive.py` skips it).

To add one: copy `<package>/dist/svg/<name>_24_item.svg` here under the item's name, replace its `width` and `height` attributes with `viewBox="0 0 24 24"`, then run `python overrides/.icons/fabric/derive.py` to make the outline. Zensical caches inlined icons in `.cache/` at the repo root; delete it after changing anything here.
