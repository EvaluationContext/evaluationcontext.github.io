/**
 * Evaluation Context — Interactions
 * Reading progress bar, blog-card reveal, card tilt and the
 * blog index command bar (year, category, series and tag filters).
 */
(function () {
  "use strict";

  /* ------------------------------------------------
     1. Reading progress bar (blog posts only)
     ------------------------------------------------ */
  function initProgress() {
    var content = document.querySelector(".md-content--post .md-content__inner");
    if (!content) return;

    var bar = document.createElement("div");
    bar.className = "ec-progress";
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-label", "Reading progress");
    document.body.appendChild(bar);

    var ticking = false;
    function updateProgress() {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          var docHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (docHeight > 0) {
            var pct = Math.min((window.scrollY / docHeight) * 100, 100);
            bar.style.width = pct + "%";
            bar.setAttribute("aria-valuenow", Math.round(pct));
          }
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
  }

  /* ------------------------------------------------
     2. Scroll-reveal for blog cards
     ------------------------------------------------ */
  function initReveal() {
    if (!("IntersectionObserver" in window)) return;

    var cards = document.querySelectorAll(".md-post--excerpt:not([hidden])");
    if (!cards.length) return;

    cards.forEach(function (card, i) {
      card.style.opacity = "0";
      card.style.transform = "translateY(24px)";
      card.style.transition =
        "opacity 0.55s cubic-bezier(0.16,1,0.3,1) " +
        Math.min(i * 0.07, 0.35) + "s, " +
        "transform 0.55s cubic-bezier(0.16,1,0.3,1) " +
        Math.min(i * 0.07, 0.35) + "s";
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    cards.forEach(function (card) {
      observer.observe(card);
    });
  }

  /* ------------------------------------------------
     3. Grid card tilt effect (about page cards)
     ------------------------------------------------ */
  function initCardTilt() {
    var gridCards = document.querySelectorAll(".grid.cards > ul > li, .grid.cards > ol > li");
    if (!gridCards.length) return;

    gridCards.forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var rect = card.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width  - 0.5;
        var y = (e.clientY - rect.top)  / rect.height - 0.5;
        card.style.transform =
          "perspective(600px) rotateY(" + (x * 4) + "deg) rotateX(" + (-y * 4) + "deg) translateY(-2px)";
      });

      card.addEventListener("mouseleave", function () {
        card.style.transform = "";
        card.style.transition = "transform 0.4s cubic-bezier(0.16,1,0.3,1)";
        setTimeout(function () { card.style.transition = ""; }, 400);
      });
    });
  }

  /* ------------------------------------------------
     4. Blog index filters. Every post is a card on the
        index, so the filters are client-side: a command
        bar above the cards shows "$ posts", the active
        selections as removable tokens, a dropdown per
        facet with counts that reflect the other
        selections, and the number of posts shown.
        The selection lives in the URL hash:
          #category=cicd,dax&year=2025,2024&tags=svg,performance
     ------------------------------------------------ */
  var filtersBound = false;
  var openMenu = null;   // which dropdown is open: "year", "category", "series", "tag" or null

  function slugify(t) {
    return t.toLowerCase().replace(/ /g, "-").replace(/\//g, "");
  }

  function isBlogIndex() {
    return !/\/(category|\d{4}|page)\//.test(location.pathname);
  }

  function readState() {
    var h = decodeURIComponent(location.hash || "").replace(/^#/, "");
    var s = { categories: [], years: [], tags: [], series: [] };
    var legacy = /^tag:(.+)$/.exec(h);
    if (legacy) { s.tags = legacy[1].split(",").filter(Boolean); return s; }
    h.split("&").forEach(function (kv) {
      var i = kv.indexOf("=");
      if (i < 0) return;
      var k = kv.slice(0, i), v = kv.slice(i + 1);
      if (k === "category") s.categories = v.split(",").filter(Boolean);
      else if (k === "year") s.years = v.split(",").filter(Boolean);
      else if (k === "tags") s.tags = v.split(",").filter(Boolean);
      else if (k === "series") s.series = v.split(",").filter(Boolean);
    });
    return s;
  }

  function writeState(s) {
    var parts = [];
    if (s.categories.length) parts.push("category=" + s.categories.join(","));
    if (s.years.length) parts.push("year=" + s.years.join(","));
    if (s.tags.length) parts.push("tags=" + s.tags.join(","));
    if (s.series.length) parts.push("series=" + s.series.join(","));
    history.pushState(null, "", location.pathname + location.search + (parts.length ? "#" + parts.join("&") : ""));
    applyFilters();
  }

  function cardData(card) {
    if (card._ec) return card._ec;
    var cat = card.querySelector(".ec-chip--category");
    var time = card.querySelector("time[datetime]");
    var names = (card.getAttribute("data-tags") || "").split("|").filter(Boolean);
    card._ec = {
      category: cat ? cat.textContent.trim() : "",
      categorySlug: cat ? slugify(cat.textContent.trim()) : "",
      year: time ? time.getAttribute("datetime").slice(0, 4) : "",
      series: card.getAttribute("data-series") || "",
      seriesSlug: slugify(card.getAttribute("data-series") || ""),
      tagNames: names,
      tags: names.map(slugify)
    };
    return card._ec;
  }

  function matches(d, s, skip) {
    if (skip !== "category" && s.categories.length && s.categories.indexOf(d.categorySlug) === -1) return false;
    if (skip !== "year" && s.years.length && s.years.indexOf(d.year) === -1) return false;
    if (skip !== "series" && s.series.length && s.series.indexOf(d.seriesSlug) === -1) return false;
    if (skip !== "tags" && !s.tags.every(function (t) { return d.tags.indexOf(t) !== -1; })) return false;
    return true;
  }

  // The blog plugin's Archive and Categories groups in the primary navigation
  function blogNavGroups() {
    var groups = [];
    document.querySelectorAll(".md-sidebar--primary li.md-nav__item--section, .md-sidebar--primary li.md-nav__item--nested").forEach(function (li) {
      var lab = li.querySelector(":scope > label.md-nav__link .md-ellipsis, :scope > .md-nav__container .md-ellipsis");
      var t = lab ? lab.textContent.trim() : "";
      if (t === "Archive" || t === "Categories" || t === "Year") groups.push(li);
    });
    return groups;
  }

  // Small helpers for the bar
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function icon(path) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", path);
    svg.appendChild(p);
    return svg;
  }
  var ICON_X = "M18 6 6 18M6 6l12 12";
  var ICON_DOWN = "M6 9l6 6 6-6";

  // facets: [{kind, flag, entries: [{label, value, count, active}]}]
  function buildBar(facets, shown) {
    var bar = el("section", "ec-cmd");
    bar.setAttribute("aria-label", "Filter posts");
    bar.appendChild(el("span", "ec-cmd__ps", "$ posts"));

    var any = false;
    facets.forEach(function (f) {
      f.entries.forEach(function (e) {
        if (!e.active) return;
        any = true;
        var b = el("button", "ec-cmd__tok", "--" + f.flag + " " + e.label);
        b.type = "button";
        b.setAttribute("data-filter", f.kind);
        b.setAttribute("data-value", e.value);
        b.setAttribute("aria-label", "Remove filter " + f.flag + " " + e.label);
        b.appendChild(icon(ICON_X));
        bar.appendChild(b);
      });
    });

    facets.forEach(function (f) {
      var g = el("span", "ec-cmd__group");
      var open = openMenu === f.kind;
      var d = el("button", "ec-cmd__dd", "--" + f.flag);
      d.type = "button";
      d.setAttribute("data-menu", f.kind);
      d.setAttribute("aria-expanded", open ? "true" : "false");
      d.setAttribute("aria-controls", "__cmd_" + f.kind);
      d.appendChild(icon(ICON_DOWN));
      var menu = el("ul", "ec-cmd__menu");
      menu.id = "__cmd_" + f.kind;
      if (!open) menu.hidden = true;
      f.entries.forEach(function (e) {
        var li = el("li");
        var o = el("button", "ec-cmd__opt" + (e.count === 0 && !e.active ? " is-empty" : ""));
        o.type = "button";
        o.setAttribute("data-filter", f.kind);
        o.setAttribute("data-value", e.value);
        o.setAttribute("aria-pressed", e.active ? "true" : "false");
        o.appendChild(el("span", "", e.label));
        o.appendChild(el("small", "", e.count));
        li.appendChild(o);
        menu.appendChild(li);
      });
      g.appendChild(d);
      g.appendChild(menu);
      bar.appendChild(g);
    });

    if (any) {
      var c = el("button", "ec-cmd__clear", "clear");
      c.type = "button";
      c.setAttribute("data-filter", "clear");
      c.appendChild(icon(ICON_X));
      bar.appendChild(c);
    }

    bar.appendChild(el("span", "ec-cmd__n", shown + (shown === 1 ? " post" : " posts")));
    return bar;
  }

  function applyFilters() {
    var cards = Array.prototype.slice.call(document.querySelectorAll(".md-post--excerpt[data-tags]"));
    if (!cards.length || !isBlogIndex()) return;
    var s = readState();

    // Visibility
    var shown = 0;
    cards.forEach(function (card) {
      var show = matches(cardData(card), s, null);
      card.hidden = !show;
      if (show) shown++;
    });

    // Facet counts (each facet ignores its own selection)
    var cats = {}, catNames = {}, years = {}, tags = {}, tagNames = {}, series = {}, seriesNames = {};
    cards.forEach(function (card) {
      var d = cardData(card);
      if (d.categorySlug) { catNames[d.categorySlug] = d.category; if (!(d.categorySlug in cats)) cats[d.categorySlug] = 0; }
      if (d.year && !(d.year in years)) years[d.year] = 0;
      if (d.seriesSlug) { seriesNames[d.seriesSlug] = d.series; if (!(d.seriesSlug in series)) series[d.seriesSlug] = 0; }
      d.tags.forEach(function (t, i) { tagNames[t] = d.tagNames[i]; if (!(t in tags)) tags[t] = 0; });
      if (matches(d, s, "category") && d.categorySlug) cats[d.categorySlug]++;
      if (matches(d, s, "year") && d.year) years[d.year]++;
      if (matches(d, s, "series") && d.seriesSlug) series[d.seriesSlug]++;
      if (matches(d, s, null)) d.tags.forEach(function (t) { tags[t]++; });
    });

    var facets = [
      { kind: "year", flag: "year", entries: Object.keys(years).sort().reverse().map(function (y) {
        return { label: y, value: y, count: years[y], active: s.years.indexOf(y) !== -1 };
      }) },
      { kind: "category", flag: "category", entries: Object.keys(cats).sort(function (a, b) { return catNames[a].localeCompare(catNames[b]); }).map(function (k) {
        return { label: catNames[k], value: k, count: cats[k], active: s.categories.indexOf(k) !== -1 };
      }) },
      { kind: "series", flag: "series", entries: Object.keys(series).sort(function (a, b) { return seriesNames[a].localeCompare(seriesNames[b]); }).map(function (k) {
        return { label: seriesNames[k], value: k, count: series[k], active: s.series.indexOf(k) !== -1 };
      }) },
      { kind: "tag", flag: "tags", entries: Object.keys(tags).sort(function (a, b) { return tagNames[a].localeCompare(tagNames[b]); }).map(function (t) {
        return { label: tagNames[t], value: t, count: tags[t], active: s.tags.indexOf(t) !== -1 };
      }) }
    ];

    // The bar sits above the first card
    var inner = cards[0].parentNode;
    inner.querySelectorAll(".ec-cmd").forEach(function (n) { n.remove(); });
    inner.insertBefore(buildBar(facets, shown), cards[0]);

    // Card chips mirror the selection
    document.querySelectorAll(".md-post__chips .ec-chip").forEach(function (chip) {
      var isCat = chip.classList.contains("ec-chip--category");
      var isSeries = chip.classList.contains("ec-chip--series");
      var v = isCat ? slugify(chip.textContent.trim()) : slugify(chip.getAttribute(isSeries ? "data-series" : "data-tag") || "");
      chip.classList.toggle("ec-tag-active", isCat ? s.categories.indexOf(v) !== -1 : isSeries ? s.series.indexOf(v) !== -1 : s.tags.indexOf(v) !== -1);
    });
  }

  function initFilters() {
    var cfg = document.getElementById("__config");
    var base = (cfg ? (JSON.parse(cfg.textContent).base || ".") : ".").replace(/\/$/, "");

    // Tag and series chips on cards point at the filtered index
    document.querySelectorAll("a.ec-chip[data-tag]").forEach(function (a) {
      a.href = base + "/#tags=" + slugify(a.getAttribute("data-tag"));
    });
    document.querySelectorAll("a.ec-chip[data-series]").forEach(function (a) {
      a.href = base + "/#series=" + slugify(a.getAttribute("data-series"));
    });

    // The Archive and Categories groups lead to listing pages without the
    // filters, so they leave the navigation everywhere.
    blogNavGroups().forEach(function (li) { li.remove(); });

    // That leaves the Blog section with no children but still a chevron in
    // the phone drawer: make it a plain link.
    document.querySelectorAll(".md-sidebar--primary li.md-nav__item--nested").forEach(function (li) {
      var ul = li.querySelector(":scope > nav > ul");
      var a = li.querySelector(":scope > .md-nav__container > a.md-nav__link");
      if (!ul || ul.children.length || !a) return;
      li.querySelectorAll(":scope > input.md-nav__toggle, :scope > nav").forEach(function (n) { n.remove(); });
      var box = li.querySelector(":scope > .md-nav__container");
      li.replaceChild(a, box);
      li.classList.remove("md-nav__item--nested", "md-nav__item--section");
    });

    if (!filtersBound) {
      filtersBound = true;
      // Capture phase: runs before instant navigation's own click handler
      document.addEventListener("click", function (e) {
        var cards = document.querySelector(".md-post--excerpt[data-tags]");
        if (!cards || !isBlogIndex()) return;   // elsewhere, let links navigate
        var closest = e.target.closest ? e.target.closest.bind(e.target) : function () { return null; };

        // Dropdown open and close
        var m = closest("[data-menu]");
        if (m) {
          e.preventDefault();
          var k = m.getAttribute("data-menu");
          openMenu = openMenu === k ? null : k;
          applyFilters();
          return;
        }
        if (openMenu && !closest(".ec-cmd")) {
          openMenu = null;
          applyFilters();
        }

        var t = closest("[data-filter], a.ec-chip[data-tag], a.ec-chip[data-series], a.ec-chip--category");
        if (!t) return;
        e.preventDefault();
        e.stopPropagation();
        var s = readState();
        var kind = t.getAttribute("data-filter");
        if (!kind) kind = t.classList.contains("ec-chip--category") ? "category" : t.classList.contains("ec-chip--series") ? "series" : "tag";
        var v = t.getAttribute("data-value");
        if (v === null) v = kind === "category" ? slugify(t.textContent.trim()) : slugify(t.getAttribute(kind === "series" ? "data-series" : "data-tag") || "");
        function toggle(list) { var i = list.indexOf(v); if (i === -1) list.push(v); else list.splice(i, 1); }
        if (kind === "category") toggle(s.categories);
        else if (kind === "year") toggle(s.years);
        else if (kind === "tag") toggle(s.tags);
        else if (kind === "series") toggle(s.series);
        else if (kind === "clear") { s = { categories: [], years: [], tags: [], series: [] }; openMenu = null; }
        writeState(s);
      }, true);
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && openMenu) { openMenu = null; applyFilters(); }
      });
      window.addEventListener("popstate", applyFilters);
      window.addEventListener("hashchange", applyFilters);
    }
    openMenu = null;
    applyFilters();
  }

  /* ------------------------------------------------
     5. Bootstrap
     ------------------------------------------------ */
  function init() {
    initProgress();
    initFilters();
    initReveal();
    initCardTilt();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Re-init on instant navigation
  if (typeof document$ !== "undefined") {
    document$.subscribe(function () {
      var oldBar = document.querySelector(".ec-progress");
      if (oldBar) oldBar.remove();
      init();
    });
  }
})();
