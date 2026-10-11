// Renders ```vegalite fenced blocks with vega-embed.
//
// Replaces mkdocs-charts-plugin, which Zensical does not run. The fence is
// configured in zensical.toml with pymdownx.superfences.fence_div_format, so
// each block arrives as <div class="vegalite">{escaped JSON}</div>.
// Adapted from mkdocs-charts-plugin (MIT), itself adapted from
// https://github.com/koaning/justcharts
(function () {
  var THEME_LIGHT = "default";
  var THEME_DARK = "dark";
  var DARK_SCHEMES = ["slate"];
  var RENDERER = "svg";
  var DEFAULT_WIDTH = "container";

  var charts = [];

  function getTheme() {
    var scheme = document.body.getAttribute("data-md-color-scheme");
    if (scheme) {
      return DARK_SCHEMES.indexOf(scheme) !== -1 ? THEME_DARK : THEME_LIGHT;
    }
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return THEME_DARK;
    }
    return THEME_LIGHT;
  }

  function findParent(el, className) {
    while (el && el.parentNode) {
      el = el.parentNode;
      if (el.classList && el.classList.contains(className)) return el;
    }
    return null;
  }

  function contentWidth(el) {
    var parent = findParent(el, "md-content");
    if (!parent) return 800;
    var style = getComputedStyle(parent);
    return parent.offsetWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  }

  function render(entry) {
    vegaEmbed(entry.block, entry.spec, {
      actions: false,
      theme: getTheme(),
      renderer: RENDERER
    }).catch(function (err) {
      console.error("vegalite: failed to render chart", err);
    });
  }

  function embed(block, spec) {
    spec = Object.assign(
      { "$schema": "https://vega.github.io/schema/vega-lite/v5.json" },
      spec
    );
    if (!("width" in spec)) spec.width = DEFAULT_WIDTH;

    // Content tabs report zero width while hidden, so use an absolute width.
    if (findParent(block, "tabbed-content") && isNaN(spec.width)) {
      spec.width = contentWidth(block);
    }

    var entry = { block: block, spec: spec };
    charts.push(entry);
    render(entry);
  }

  function init() {
    if (typeof vegaEmbed === "undefined") return;
    var blocks = document.querySelectorAll("div.vegalite:not([data-vegalite])");
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      var source = block.textContent;
      block.setAttribute("data-vegalite", "");
      block.style.width = "100%";
      var spec;
      try {
        spec = JSON.parse(source);
      } catch (err) {
        console.error("vegalite: block is not valid JSON", err, source);
        continue;
      }
      if ("schema-url" in spec) {
        fetch(spec["schema-url"])
          .then(function (resp) { return resp.json(); })
          .then(function (remote) { embed(block, remote); });
      } else {
        embed(block, spec);
      }
    }
  }

  function rerender() {
    for (var i = 0; i < charts.length; i++) render(charts[i]);
  }

  // Re-theme charts when the palette toggle changes the colour scheme.
  new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === "data-md-color-scheme") {
        rerender();
        return;
      }
    }
  }).observe(document.body, { attributes: true });

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", rerender);
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(function () { charts = []; init(); });
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
