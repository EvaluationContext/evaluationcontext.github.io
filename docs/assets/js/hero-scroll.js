/**
 * Hero Image Scroll Effect
 * Fades out the fixed hero banner as the user scrolls down.
 */
(function () {
  "use strict";

  function initHeroScroll() {
    var hero = document.querySelector(".hero-banner");
    if (!hero) return;

    var heroImage = hero.querySelector(".hero-banner__image");
    var heroHeight = hero.offsetHeight;
    var ticking = false;

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          var scrollY = window.scrollY || window.pageYOffset;
          var progress = Math.min(scrollY / heroHeight, 1);

          // Fade out the image as user scrolls
          var opacity = 1 - progress * 1.2;
          if (opacity < 0) opacity = 0;
          heroImage.style.opacity = opacity;

          ticking = false;
        });
        ticking = true;
      }
    }

    // Recalculate height on resize
    window.addEventListener("resize", function () {
      heroHeight = hero.offsetHeight;
    });

    window.addEventListener("scroll", onScroll, { passive: true });

    // Run once on load in case page is already scrolled
    onScroll();
  }

  // Run after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeroScroll);
  } else {
    initHeroScroll();
  }
})();
