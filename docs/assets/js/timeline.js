// Renders ```timeline fenced blocks as a post timeline.
//
// The fence is configured in zensical.toml with
// pymdownx.superfences.fence_div_format, so each block arrives as
// <div class="ec-timeline">{escaped JSON}</div>. The JSON shape:
//
//   {
//     "categories": ["CI/CD", "DAX", ...],          // fixed colour order
//     "posts": [{
//       "date": "2025-10-31", "title": "...", "url": "/posts/...",
//       "image": "/2026/.../thumbs/slug.jpg", "category": "DAX",
//       "views": 347, "impressions": 8375, "reactions": 66, "comments": 4
//     }, ...],
//     "sessions": [{                                 // optional, no metrics
//       "date": "2026-04", "title": "...", "event": "SQLBits", "url": "https://..."
//     }, ...]
//   }
//
// Output: a row of totals (posts, each metric, sessions) that follow the
// current filter, a toolbar of category chips (filter and legend) and a sort
// select, an SVG timeline with a dot per post (hover highlights the
// card, click shows that card alone) and a grid of post cards with the
// thumbnail on the right and a bar per metric filled as a share of the
// best post.
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var timelineId = 0;

  // Icon paths copied from the theme's icon set (material/eye,
  // fontawesome/brands/linkedin, material/heart, material/comment-outline).
  var ICONS = {
    views: { box: "0 0 24 24", d: "M12 9a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3m0 8a5 5 0 0 1-5-5 5 5 0 0 1 5-5 5 5 0 0 1 5 5 5 5 0 0 1-5 5m0-12.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5" },
    impressions: { box: "0 0 448 512", d: "M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3M135.4 416H69V202.2h66.5V416zM102.2 96a38.5 38.5 0 1 1 0 77 38.5 38.5 0 1 1 0-77m282.1 320h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9z" },
    reactions: { box: "0 0 24 24", d: "m12 21.35-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.53z" },
    comments: { box: "0 0 24 24", d: "M9 22a1 1 0 0 1-1-1v-3H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6.1l-3.7 3.71c-.2.19-.45.29-.7.29zm1-6v3.08L13.08 16H20V4H4v12z" }
  };

  var METRICS = [
    { key: "views", label: "Views" },
    { key: "impressions", label: "LinkedIn impressions" },
    { key: "reactions", label: "Reactions" },
    { key: "comments", label: "Comments" }
  ];

  var SORTS = [
    { id: "date-asc", label: "Date, oldest first" },
    { id: "date-desc", label: "Date, newest first" },
    { id: "views", label: "Most views", metric: "views" },
    { id: "impressions", label: "Most LinkedIn impressions", metric: "impressions" },
    { id: "reactions", label: "Most reactions", metric: "reactions" },
    { id: "comments", label: "Most comments", metric: "comments" }
  ];

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) node.setAttribute(k, attrs[k]);
    return node;
  }

  function icon(key) {
    var svg = svgEl("svg", { viewBox: ICONS[key].box, "class": "ec-tl__icon", "aria-hidden": "true" });
    svg.appendChild(svgEl("path", { d: ICONS[key].d }));
    return svg;
  }

  function parseDate(s) {
    var p = s.split("-");
    // month-only dates (sessions) sit mid-month
    return Date.UTC(+p[0], +p[1] - 1, p[2] ? +p[2] : 15);
  }

  function fmtMonth(ms) {
    var d = new Date(ms);
    return MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear();
  }

  function fmtDate(ms) {
    var d = new Date(ms);
    return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear();
  }

  function fmtNum(v) {
    if (v === null || v === undefined || v === "") return "–";
    return Number(v).toLocaleString("en-GB");
  }

  function num(v) {
    return v === null || v === undefined || v === "" ? -1 : Number(v);
  }

  /* ---- build ---- */

  function build(block, data) {
    var categories = data.categories || [];
    var posts = (data.posts || []).map(function (p, i) {
      var cat = categories.indexOf(p.category);
      if (cat === -1) { categories.push(p.category); cat = categories.length - 1; }
      return Object.assign({}, p, { ms: parseDate(p.date), slot: (cat % 5) + 1, index: i, rows: {} });
    });
    var sessions = (data.sessions || []).map(function (s) {
      return Object.assign({}, s, { ms: parseDate(s.date), isSession: true });
    });

    var state = { active: {}, selected: null, sort: SORTS[0] };

    var root = el("div", "ec-tl");
    var popupId = "ec-tl-popup-" + (++timelineId);
    block.replaceWith(root);

    var popup = el("div", "ec-tl__popup");
    popup.id = popupId;
    popup.setAttribute("role", "tooltip");
    popup.hidden = true;
    root.appendChild(popup);

    /* totals: follow the current filter */
    var totals = el("div", "ec-tl__totals");
    totals.setAttribute("aria-live", "polite");
    var totalEls = {};
    function addTotal(key, label) {
      var item = el("div", "ec-tl__total");
      if (ICONS[key]) item.appendChild(icon(key));
      if (key === "sessions") {
        // the rail's diamond doubles as the key for sessions
        var diamond = svgEl("svg", { viewBox: "0 0 12 12", "class": "ec-tl__icon ec-tl__session", "aria-hidden": "true" });
        diamond.appendChild(svgEl("path", { d: "M6 1 11 6 6 11 1 6Z", "class": "ec-tl__diamond" }));
        item.appendChild(diamond);
      }
      var value = el("span", "ec-tl__total-value");
      item.appendChild(value);
      item.appendChild(el("span", "ec-tl__total-label", label));
      totalEls[key] = value;
      totals.appendChild(item);
    }
    addTotal("posts", "Posts");
    METRICS.forEach(function (m) { addTotal(m.key, m.label); });
    if (sessions.length) addTotal("sessions", "Sessions");
    root.appendChild(totals);

    function updateTotals(visible) {
      totalEls.posts.textContent = fmtNum(visible.length);
      METRICS.forEach(function (m) {
        totalEls[m.key].textContent = fmtNum(visible.reduce(function (acc, p) { return acc + Math.max(0, num(p[m.key])); }, 0));
      });
      if (totalEls.sessions) totalEls.sessions.textContent = fmtNum(sessions.length);
    }

    /* toolbar */
    var toolbar = el("div", "ec-tl__toolbar");
    var chips = el("div", "ec-tl__chips");
    chips.setAttribute("role", "group");
    chips.setAttribute("aria-label", "Filter by category");
    var chipEls = {};
    categories.forEach(function (name, i) {
      var count = posts.filter(function (p) { return p.category === name; }).length;
      var chip = el("button", "ec-tl__chip ec-tl--c" + ((i % 5) + 1));
      chip.type = "button";
      chip.setAttribute("aria-pressed", "false");
      chip.appendChild(document.createTextNode(name + " "));
      chip.appendChild(el("span", "ec-tl__count", String(count)));
      chip.addEventListener("click", function () {
        state.selected = null;
        state.active[name] = !state.active[name];
        apply();
      });
      chipEls[name] = chip;
      chips.appendChild(chip);
    });
    var clear = el("button", "ec-tl__clear", "Clear");
    clear.type = "button";
    clear.hidden = true;
    clear.addEventListener("click", function () {
      state.selected = null;
      state.active = {};
      apply();
    });
    chips.appendChild(clear);
    toolbar.appendChild(chips);

    var sortWrap = el("label", "ec-tl__sort");
    sortWrap.appendChild(document.createTextNode("Sort"));
    var select = el("select");
    select.setAttribute("aria-label", "Sort posts");
    SORTS.forEach(function (s) {
      var opt = el("option", null, s.label);
      opt.value = s.id;
      select.appendChild(opt);
    });
    select.addEventListener("change", function () {
      state.sort = SORTS.filter(function (s) { return s.id === select.value; })[0] || SORTS[0];
      apply();
    });
    sortWrap.appendChild(select);
    toolbar.appendChild(sortWrap);
    root.appendChild(toolbar);

    /* rail */
    var rail = el("div", "ec-tl__rail");
    root.appendChild(rail);

    /* cards */
    var grid = el("div", "ec-tl__cards");
    root.appendChild(grid);
    var empty = el("p", "ec-tl__empty", "No posts in the selected categories.");
    empty.hidden = true;

    var maxBy = {};
    METRICS.forEach(function (m) {
      maxBy[m.key] = posts.reduce(function (acc, p) { return Math.max(acc, num(p[m.key])); }, 0) || 1;
    });

    posts.forEach(function (p) {
      var card = el("a", "ec-tl__card ec-tl--c" + p.slot);
      card.href = p.url;

      var body = el("span", "ec-tl__body");
      body.appendChild(el("span", "ec-tl__title", p.title));
      var meta = el("span", "ec-tl__meta");
      var time = el("time", null, fmtDate(p.ms));
      time.setAttribute("datetime", p.date);
      meta.appendChild(time);
      meta.appendChild(el("span", "ec-tl__cat", p.category));
      body.appendChild(meta);

      // one bar per metric, filled as a share of the best post
      var bars = el("span", "ec-tl__bars");
      METRICS.forEach(function (m) {
        var v = num(p[m.key]);
        var row = el("span", "ec-tl__row");
        row.title = m.label;
        row.appendChild(icon(m.key));
        var track = el("span", "ec-tl__track");
        var fill = el("span", "ec-tl__fill");
        fill.style.width = (v < 0 ? 0 : v / maxBy[m.key] * 100) + "%";
        track.appendChild(fill);
        row.appendChild(track);
        row.appendChild(el("span", "ec-tl__value", v < 0 ? "–" : fmtNum(v)));
        row.appendChild(el("span", "ec-tl__sr", " " + m.label));
        p.rows[m.key] = row;
        bars.appendChild(row);
      });
      body.appendChild(bars);
      card.appendChild(body);

      if (p.image) {
        var thumb = el("span", "ec-tl__thumb");
        var img = el("img");
        img.src = p.image;
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        thumb.appendChild(img);
        card.appendChild(thumb);
      }

      p.card = card;
      grid.appendChild(card);

      // hovering a card lights its dot on the timeline
      card.addEventListener("mouseenter", function () { setActive(p, true); });
      card.addEventListener("mouseleave", function () { setActive(p, false); });
      card.addEventListener("focus", function () { setActive(p, true); });
      card.addEventListener("blur", function () { setActive(p, false); });
    });
    grid.appendChild(empty);

    function showPopup(p, dot) {
    popup.textContent = "";
    popup.classList.toggle("is-session", !!p.isSession);
    var content = el("div", "ec-tl__popup-body");
    content.appendChild(el("span", "ec-tl__popup-title", p.title));
    if (p.isSession) {
      content.appendChild(el("span", "ec-tl__popup-date", fmtMonth(p.ms) + " · " + p.event));
      content.appendChild(el("span", "ec-tl__popup-kind", "Session"));
    } else {
    content.appendChild(el("span", "ec-tl__popup-date", fmtDate(p.ms) + " · " + p.category));
    var stats = el("span", "ec-tl__popup-stats");
    METRICS.forEach(function (m) {
      var value = num(p[m.key]);
      var stat = el("span", "ec-tl__popup-stat");
      stat.appendChild(el("span", "ec-tl__popup-label", m.label));
      stat.appendChild(el("span", "ec-tl__popup-value", value < 0 ? "–" : fmtNum(value)));
      stats.appendChild(stat);
    });
    content.appendChild(stats);
    }
    popup.appendChild(content);
    if (p.image) {
      var image = el("img", "ec-tl__popup-image");
      image.src = p.image;
      image.alt = "";
      image.loading = "lazy";
      popup.appendChild(image);
    }
    popup.hidden = false;
    var rootRect = root.getBoundingClientRect();
    var dotRect = dot.getBoundingClientRect();
    var left = dotRect.left + dotRect.width / 2 - rootRect.left - popup.offsetWidth / 2;
    popup.style.left = Math.max(0, Math.min(left, root.clientWidth - popup.offsetWidth)) + "px";
    popup.style.top = (dotRect.bottom - rootRect.top + 8) + "px";
    }

    function hidePopup() {
    popup.hidden = true;
    }

    function setActive(p, on) {
    if (p.card) p.card.classList.toggle("is-active", on);
    if (p.dot) p.dot.classList.toggle("is-active", on);
    }

    function toggleSelect(p) {
      state.selected = state.selected === p ? null : p;
      apply();
    }

    /* rail drawing: re-run on resize */
    var railWidth = 0;

    function drawRail() {
      var width = rail.clientWidth;
      if (!width || width === railWidth) return;
      railWidth = width;
      rail.textContent = "";

      var narrow = width < 520;
      var padL = 4, padR = 4, top = 8;
      var minMs = Infinity, maxMs = -Infinity;
      posts.concat(sessions).forEach(function (d) {
        if (d.ms < minMs) minMs = d.ms;
        if (d.ms > maxMs) maxMs = d.ms;
      });
      if (!isFinite(minMs)) return;
      // pad the axis a little either side of the first and last post
      var span = Math.max(maxMs - minMs, 86400000);
      minMs -= span * 0.02;
      maxMs += span * 0.02;

      function x(ms) { return padL + (ms - minMs) / (maxMs - minMs) * (width - padL - padR); }

      // dots in lanes so same-week posts do not sit on top of each other
      var r = 5.5, minGap = 2 * r + 3;
      var lanes = [];
      var sorted = posts.slice().sort(function (a, b) { return a.ms - b.ms; });
      sorted.forEach(function (p) {
        var px = x(p.ms), lane = 0;
        while (lanes[lane] !== undefined && px - lanes[lane] < minGap) lane++;
        lanes[lane] = px;
        p.px = px;
        p.lane = lane;
      });
      var baseY = top + lanes.length * (2 * r + 2) + r;

      // sessions stack downwards below the axis in their own lanes
      var sLanes = [];
      var sSorted = sessions.slice().sort(function (a, b) { return a.ms - b.ms; });
      sSorted.forEach(function (s) {
        var px = x(s.ms), lane = 0;
        while (sLanes[lane] !== undefined && px - sLanes[lane] < minGap) lane++;
        sLanes[lane] = px;
        s.px = px;
        s.lane = lane;
      });
      var sTop = baseY + 6 + r;
      var height = (sLanes.length ? sTop + (sLanes.length - 1) * (2 * r + 3) + r + 2 : baseY) + 18;

      var svg = svgEl("svg", {
        viewBox: "0 0 " + width + " " + height,
        width: width,
        height: height,
        role: "group",
        "aria-label": "Posts in order of publication"
      });

      svg.appendChild(svgEl("line", { x1: padL, x2: width - padR, y1: baseY, y2: baseY, "class": "ec-tl__axis" }));

      // month ticks
      var d = new Date(minMs);
      var tick = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
      var step = narrow ? 3 : (width < 760 ? 2 : 1), n = 0;
      while (tick <= maxMs) {
        var td = new Date(tick);
        var tx = x(tick);
        svg.appendChild(svgEl("line", { x1: tx, x2: tx, y1: baseY, y2: baseY + 4, "class": "ec-tl__tick" }));
        if (n % step === 0) {
          // keep the first and last labels inside the rail
          var anchor = tx < 28 ? "start" : (tx > width - 28 ? "end" : "middle");
          var label = svgEl("text", { x: tx, y: height - 4, "class": "ec-tl__label", "text-anchor": anchor });
          label.textContent = MONTHS[td.getUTCMonth()] + (td.getUTCMonth() === 0 || n === 0 ? " " + td.getUTCFullYear() : "");
          svg.appendChild(label);
        }
        n++;
        tick = Date.UTC(td.getUTCFullYear(), td.getUTCMonth() + 1, 1);
      }

      // dots: hover lights the card, click shows that card alone
      sorted.forEach(function (p) {
        var dot = svgEl("g", { "class": "ec-tl__dot ec-tl--c" + p.slot, tabindex: "0", role: "button", "aria-pressed": "false" });
        dot.setAttribute("aria-label", p.title + ", " + fmtDate(p.ms));
        dot.setAttribute("aria-describedby", popupId);
        var title = svgEl("title");
        title.textContent = p.title + " · " + fmtDate(p.ms);
        dot.appendChild(title);
        var cy = (baseY - 2 - r - p.lane * (2 * r + 2)).toFixed(1);
        // a larger invisible hit area than the painted dot
        dot.appendChild(svgEl("circle", { cx: p.px.toFixed(1), cy: cy, r: 12, "class": "ec-tl__hit" }));
        dot.appendChild(svgEl("circle", { cx: p.px.toFixed(1), cy: cy, r: r }));
        dot.addEventListener("mouseenter", function () { setActive(p, true); showPopup(p, dot); });
        dot.addEventListener("mouseleave", function () { setActive(p, false); hidePopup(); });
        dot.addEventListener("focus", function () { setActive(p, true); showPopup(p, dot); });
        dot.addEventListener("blur", function () { setActive(p, false); hidePopup(); });
        dot.addEventListener("click", function () { toggleSelect(p); });
        dot.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSelect(p); }
        });
        p.dot = dot;
        svg.appendChild(dot);
      });

      // sessions: hover shows the popup, click opens the recording or slides
      sSorted.forEach(function (s) {
        var g = svgEl("g", { "class": "ec-tl__session", tabindex: "0", role: "link" });
        g.setAttribute("aria-label", "Session: " + s.title + ", " + s.event + ", " + fmtMonth(s.ms));
        g.setAttribute("aria-describedby", popupId);
        var cx = s.px, cy = sTop + s.lane * (2 * r + 3), d = r + 0.5;
        g.appendChild(svgEl("circle", { cx: cx.toFixed(1), cy: cy.toFixed(1), r: 12, "class": "ec-tl__hit" }));
        g.appendChild(svgEl("path", {
          d: "M" + cx.toFixed(1) + " " + (cy - d).toFixed(1) + "L" + (cx + d).toFixed(1) + " " + cy.toFixed(1) +
             "L" + cx.toFixed(1) + " " + (cy + d).toFixed(1) + "L" + (cx - d).toFixed(1) + " " + cy.toFixed(1) + "Z",
          "class": "ec-tl__diamond"
        }));
        function open() { if (s.url) window.open(s.url, "_blank", "noopener"); }
        g.addEventListener("mouseenter", function () { showPopup(s, g); });
        g.addEventListener("mouseleave", hidePopup);
        g.addEventListener("focus", function () { showPopup(s, g); });
        g.addEventListener("blur", hidePopup);
        g.addEventListener("click", open);
        g.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); open(); }
        });
        s.dot = g;
        svg.appendChild(g);
      });

      rail.appendChild(svg);
      applyDots();
    }

    function isVisible(p) {
      if (state.selected) return p === state.selected;
      var any = Object.keys(state.active).some(function (k) { return state.active[k]; });
      return !any || !!state.active[p.category];
    }

    function applyDots() {
      posts.forEach(function (p) {
        if (!p.dot) return;
        p.dot.classList.toggle("is-dim", !isVisible(p));
        p.dot.classList.toggle("is-selected", p === state.selected);
        p.dot.setAttribute("aria-pressed", p === state.selected ? "true" : "false");
      });
      // sessions have no category, so they fade whenever posts are filtered
      var filtering = !!state.selected || Object.keys(state.active).some(function (k) { return state.active[k]; });
      sessions.forEach(function (s) {
        if (s.dot) s.dot.classList.toggle("is-dim", filtering);
      });
    }

    function apply() {
      var metric = state.sort.metric;
      var anyCat = false;
      categories.forEach(function (name) {
        var on = !state.selected && !!state.active[name];
        anyCat = anyCat || on;
        chipEls[name].setAttribute("aria-pressed", on ? "true" : "false");
      });
      clear.hidden = !(anyCat || state.selected);

      var ordered = posts.slice().sort(function (a, b) {
        switch (state.sort.id) {
          case "date-asc": return a.ms - b.ms || a.index - b.index;
          case "date-desc": return b.ms - a.ms || a.index - b.index;
          default: return num(b[metric]) - num(a[metric]) || a.ms - b.ms;
        }
      });
      var shown = 0;
      updateTotals(posts.filter(isVisible));
      ordered.forEach(function (p) {
        // the bar being sorted on is emphasised; dates emphasise none
        for (var k in p.rows) if (p.rows.hasOwnProperty(k)) p.rows[k].classList.toggle("is-sorted", k === metric);
        p.card.hidden = !isVisible(p);
        if (!p.card.hidden) shown++;
        grid.appendChild(p.card);
      });
      empty.hidden = shown > 0;
      grid.appendChild(empty);
      applyDots();
    }

    apply();
    drawRail();

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(function () { drawRail(); }).observe(rail);
    } else {
      window.addEventListener("resize", drawRail);
    }
  }

  function init() {
    var blocks = document.querySelectorAll("div.ec-timeline:not([data-timeline])");
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      block.setAttribute("data-timeline", "");
      var data;
      try {
        data = JSON.parse(block.textContent);
      } catch (err) {
        console.error("timeline: block is not valid JSON", err);
        continue;
      }
      build(block, data);
    }
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(init);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
