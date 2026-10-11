/**
 * Evaluation Context — Interactions
 * Reading progress bar, blog-card reveal, card tilt and the
 * blog index sidebar facets (archive, categories, tags).
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
        index, so Archive, Categories and Tags in the left
        sidebar are client-side facets: click to select,
        counts reflect the other selections, order never
        changes (years descending, names alphabetical).
        The selection lives in the URL hash:
          #category=cicd&year=2025&tags=svg,performance
     ------------------------------------------------ */
  var filtersBound = false;

  function slugify(t) {
    return t.toLowerCase().replace(/ /g, "-").replace(/\//g, "");
  }

  function isBlogIndex() {
    return !/\/(category|\d{4}|page)\//.test(location.pathname);
  }

  function readState() {
    var h = decodeURIComponent(location.hash || "").replace(/^#/, "");
    var s = { category: null, year: null, tags: [] };
    var legacy = /^tag:(.+)$/.exec(h);
    if (legacy) { s.tags = legacy[1].split(",").filter(Boolean); return s; }
    h.split("&").forEach(function (kv) {
      var i = kv.indexOf("=");
      if (i < 0) return;
      var k = kv.slice(0, i), v = kv.slice(i + 1);
      if (k === "category") s.category = v || null;
      else if (k === "year") s.year = v || null;
      else if (k === "tags") s.tags = v.split(",").filter(Boolean);
    });
    return s;
  }

  function writeState(s) {
    var parts = [];
    if (s.category) parts.push("category=" + s.category);
    if (s.year) parts.push("year=" + s.year);
    if (s.tags.length) parts.push("tags=" + s.tags.join(","));
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
      tagNames: names,
      tags: names.map(slugify)
    };
    return card._ec;
  }

  function matches(d, s, skip) {
    if (skip !== "category" && s.category && d.categorySlug !== s.category) return false;
    if (skip !== "year" && s.year && d.year !== s.year) return false;
    if (skip !== "tags" && !s.tags.every(function (t) { return d.tags.indexOf(t) !== -1; })) return false;
    return true;
  }

  // The blog plugin's Archive and Categories groups in the primary navigation
  function blogNavGroups() {
    var groups = [];
    document.querySelectorAll(".md-sidebar--primary li.md-nav__item--section").forEach(function (li) {
      var lab = li.querySelector(":scope > label.md-nav__link .md-ellipsis, :scope > .md-nav__container .md-ellipsis");
      var t = lab ? lab.textContent.trim() : "";
      if (t === "Archive" || t === "Categories") groups.push(li);
    });
    return groups;
  }

  function facetSection(title, id, entries) {
    // entries: [{label, value, count, active, kind}]
    var li = document.createElement("li");
    li.className = "md-nav__item md-nav__item--section md-nav__item--nested";
    li.innerHTML =
      '<input class="md-nav__toggle md-toggle" type="checkbox" id="' + id + '" checked>' +
      '<label class="md-nav__link" for="' + id + '" id="' + id + '_label" tabindex>' +
      '<span class="md-ellipsis"></span><span class="md-nav__icon md-icon"></span></label>' +
      '<nav class="md-nav" data-md-level="2" aria-labelledby="' + id + '_label" aria-expanded="true">' +
      '<label class="md-nav__title" for="' + id + '"><span class="md-nav__icon md-icon"></span></label>' +
      '<ul class="md-nav__list" data-md-scrollfix></ul></nav>';
    li.querySelector("label.md-nav__link .md-ellipsis").textContent = title;
    li.querySelector("label.md-nav__title").appendChild(document.createTextNode(title));
    var ul = li.querySelector("ul");
    entries.forEach(function (e) {
      var item = document.createElement("li");
      item.className = "md-nav__item" + (e.count === 0 && !e.active ? " ec-facet-empty" : "");
      var a = document.createElement("a");
      a.href = "#";
      a.className = "md-nav__link ec-facet" + (e.active ? " ec-tag-active" : "");   // not md-nav__link--active: the theme would scroll the sidebar to it
      a.setAttribute("data-filter", e.kind);
      a.setAttribute("data-value", e.value);
      var text = document.createElement("span");
      text.className = "md-ellipsis";
      text.textContent = e.label;
      var badge = document.createElement("span");
      badge.className = "md-nav__count";
      badge.textContent = e.count;
      a.appendChild(text);
      a.appendChild(badge);
      item.appendChild(a);
      ul.appendChild(item);
    });
    return li;
  }

  function applyFilters() {
    var cards = Array.prototype.slice.call(document.querySelectorAll(".md-post--excerpt[data-tags]"));
    if (!cards.length || !isBlogIndex()) return;
    var list = cards[0].parentNode;
    var s = readState();

    // Visibility
    var shown = 0;
    cards.forEach(function (card) {
      var show = matches(cardData(card), s, null);
      card.hidden = !show;
      if (show) shown++;
    });

    // Facet counts (each facet ignores its own selection)
    var cats = {}, catNames = {}, years = {}, tags = {}, tagNames = {};
    cards.forEach(function (card) {
      var d = cardData(card);
      if (d.categorySlug) { catNames[d.categorySlug] = d.category; if (!(d.categorySlug in cats)) cats[d.categorySlug] = 0; }
      if (d.year && !(d.year in years)) years[d.year] = 0;
      d.tags.forEach(function (t, i) { tagNames[t] = d.tagNames[i]; if (!(t in tags)) tags[t] = 0; });
      if (matches(d, s, "category") && d.categorySlug) cats[d.categorySlug]++;
      if (matches(d, s, "year") && d.year) years[d.year]++;
      if (matches(d, s, null)) d.tags.forEach(function (t) { tags[t]++; });
    });

    // Sidebar facets take the place of the Archive and Categories groups,
    // so the phone drawer keeps the rest of the site navigation.
    var existing = document.querySelectorAll(".md-sidebar--primary li.ec-facet-section");
    var anchor = null, parent = null;
    if (existing.length) {
      parent = existing[0].parentNode; anchor = existing[existing.length - 1].nextSibling;
      existing.forEach(function (li) { li.remove(); });
    } else {
      var groups = blogNavGroups();
      if (groups.length) {
        parent = groups[0].parentNode; anchor = groups[groups.length - 1].nextSibling;
        groups.forEach(function (li) { li.remove(); });
      }
    }
    if (parent) {
      var sections = [
        facetSection("Archive", "__facet_year", Object.keys(years).sort().reverse().map(function (y) {
          return { label: y, value: y, count: years[y], active: s.year === y, kind: "year" };
        })),
        facetSection("Categories", "__facet_cat", Object.keys(cats).sort(function (a, b) { return catNames[a].localeCompare(catNames[b]); }).map(function (k) {
          return { label: catNames[k], value: k, count: cats[k], active: s.category === k, kind: "category" };
        })),
        facetSection("Tags", "__facet_tag", Object.keys(tags).sort(function (a, b) { return tagNames[a].localeCompare(tagNames[b]); }).map(function (t) {
          return { label: tagNames[t], value: t, count: tags[t], active: s.tags.indexOf(t) !== -1, kind: "tag" };
        }))
      ];
      sections.forEach(function (li) { li.classList.add("ec-facet-section"); parent.insertBefore(li, anchor); });
    }

    // Summary bar above the cards while a filter is active
    var old = document.querySelector(".ec-filter");
    if (old) old.remove();
    if (s.category || s.year || s.tags.length) {
      var bar = document.createElement("div");
      bar.className = "ec-filter";
      var text = document.createElement("span");
      text.className = "ec-filter__text";
      var labels = [];
      if (s.category) labels.push(catNames[s.category] || s.category);
      if (s.year) labels.push(s.year);
      s.tags.forEach(function (t) { labels.push(tagNames[t] || t); });
      text.textContent = shown + (shown === 1 ? " post: " : " posts: ") + labels.join(" + ");
      bar.appendChild(text);
      var clear = document.createElement("a");
      clear.href = "#";
      clear.className = "ec-filter__clear";
      clear.textContent = "Clear filters";
      clear.setAttribute("data-filter", "clear");
      bar.appendChild(clear);
      list.insertBefore(bar, list.firstChild);
    }

    // Card chips mirror the selection
    document.querySelectorAll(".md-post__chips .ec-chip").forEach(function (el) {
      var isCat = el.classList.contains("ec-chip--category");
      var v = isCat ? slugify(el.textContent.trim()) : slugify(el.getAttribute("data-tag") || "");
      el.classList.toggle("ec-tag-active", isCat ? s.category === v : s.tags.indexOf(v) !== -1);
    });
  }

  function initFilters() {
    var cfg = document.getElementById("__config");
    var base = (cfg ? (JSON.parse(cfg.textContent).base || ".") : ".").replace(/\/$/, "");

    // Chips on cards and posts point at the filtered index
    document.querySelectorAll("a.ec-chip[data-tag], a.md-tag[data-tag]").forEach(function (a) {
      a.href = base + "/#tags=" + slugify(a.getAttribute("data-tag"));
    });

    // Other pages: the Archive and Categories groups lead to listing pages
    // without the filters, so they leave the navigation.
    if (!document.querySelector(".md-post--excerpt[data-tags]") || !isBlogIndex()) {
      blogNavGroups().forEach(function (li) { li.remove(); });
    }

    if (!filtersBound) {
      filtersBound = true;
      // Capture phase: runs before instant navigation's own click handler
      document.addEventListener("click", function (e) {
        var t = e.target.closest ? e.target.closest("[data-filter], a.ec-chip[data-tag], a.ec-chip--category") : null;
        if (!t) return;
        var cards = document.querySelector(".md-post--excerpt[data-tags]");
        if (!cards || !isBlogIndex()) return;   // elsewhere, let links navigate
        e.preventDefault();
        e.stopPropagation();
        var s = readState();
        var kind = t.getAttribute("data-filter");
        if (!kind) kind = t.classList.contains("ec-chip--category") ? "category" : "tag";
        var v = t.getAttribute("data-value");
        if (v === null) v = kind === "category" ? slugify(t.textContent.trim()) : slugify(t.getAttribute("data-tag") || "");
        if (kind === "category") s.category = (v && s.category !== v) ? v : null;
        else if (kind === "year") s.year = (v && s.year !== v) ? v : null;
        else if (kind === "tag") { var i = s.tags.indexOf(v); if (i === -1) s.tags.push(v); else s.tags.splice(i, 1); }
        else if (kind === "clear") { s = { category: null, year: null, tags: [] }; }
        writeState(s);
      }, true);
      window.addEventListener("popstate", applyFilters);
      window.addEventListener("hashchange", applyFilters);
    }
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
