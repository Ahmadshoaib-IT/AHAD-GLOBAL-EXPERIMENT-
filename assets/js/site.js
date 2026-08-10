/* AHAD GLOBAL — site behaviour v2. No dependencies. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var slice = function (n) { return Array.prototype.slice.call(n); };

  /* ---- 1. Mobile navigation ------------------------------------------- */
  var toggle = document.querySelector("[data-nav-toggle]");
  var drawer = document.getElementById("site-drawer");
  if (toggle && drawer) {
    var setOpen = function (open) {
      drawer.setAttribute("data-open", open ? "true" : "false");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.documentElement.classList.toggle("nav-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    toggle.addEventListener("click", function () {
      setOpen(drawer.getAttribute("data-open") !== "true");
    });
    drawer.addEventListener("click", function (e) { if (e.target.tagName === "A") setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.getAttribute("data-open") === "true") { setOpen(false); toggle.focus(); }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 1000 && drawer.getAttribute("data-open") === "true") setOpen(false);
    });
  }

  /* ---- 2. Scroll progress --------------------------------------------- */
  var bar = document.querySelector(".scroll-progress");
  if (bar && !reduce) {
    var tick = false;
    window.addEventListener("scroll", function () {
      if (tick) return;
      tick = true;
      window.requestAnimationFrame(function () {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (h > 0 ? (window.pageYOffset / h) * 100 : 0) + "%";
        tick = false;
      });
    }, { passive: true });
  }

  /* ---- 3. Reveal on scroll -------------------------------------------- */
  var reveals = slice(document.querySelectorAll("[data-reveal]"));
  if (reveals.length) {
    if (!("IntersectionObserver" in window) || reduce) {
      reveals.forEach(function (el) { el.classList.add("is-in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
        });
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
      reveals.forEach(function (el, i) {
        el.style.transitionDelay = Math.min(i % 4, 3) * 65 + "ms";
        io.observe(el);
      });
    }
  }

  /* ---- 5. Counting figures -------------------------------------------- */
  var counters = slice(document.querySelectorAll("[data-count]"));
  if (counters.length && "IntersectionObserver" in window && !reduce) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, target = parseFloat(el.getAttribute("data-count"));
        var prefix = el.getAttribute("data-prefix") || "", suffix = el.getAttribute("data-suffix") || "";
        var dur = 1100, t0 = null;
        var step = function (ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
          var val = Math.round(target * eased);
          el.textContent = prefix + val.toLocaleString() + suffix;
          if (p < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
        co.unobserve(el);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* ---- 6. Light parallax ---------------------------------------------- */
  var px = slice(document.querySelectorAll("[data-parallax]"));
  if (px.length && !reduce && window.innerWidth > 900) {
    var pTick = false;
    window.addEventListener("scroll", function () {
      if (pTick) return;
      pTick = true;
      window.requestAnimationFrame(function () {
        var y = window.pageYOffset;
        px.forEach(function (el) {
          var rate = parseFloat(el.getAttribute("data-parallax")) || 0.06;
          el.style.transform = "translateY(" + (y * rate).toFixed(1) + "px)";
        });
        pTick = false;
      });
    }, { passive: true });
  }

  /* ---- 7. Case study filters (pillar × sector) ------------------------ */
  var filterRoot = document.querySelector("[data-filters]");
  if (filterRoot) {
    var items = slice(document.querySelectorAll("[data-case]"));
    var counter = document.querySelector("[data-case-count]");
    var empty = document.querySelector("[data-case-empty]");
    var reset = document.querySelector("[data-case-reset]");
    var state = { pillar: "all", sector: "all" };

    var apply = function () {
      var shown = 0;
      items.forEach(function (item) {
        var ok = ["pillar", "sector"].every(function (k) {
          if (state[k] === "all") return true;
          var vals = (item.getAttribute("data-" + k) || "").split("|");
          return vals.indexOf(state[k]) > -1;
        });
        if (ok) { item.removeAttribute("hidden"); shown++; } else { item.setAttribute("hidden", ""); }
      });
      if (counter) counter.textContent = shown;
      if (empty) { if (shown === 0) { empty.removeAttribute("hidden"); } else { empty.setAttribute("hidden", ""); } }
    };

    var choose = function (key, value) {
      state[key] = value;
      slice(filterRoot.querySelectorAll('[data-filter-key="' + key + '"]')).forEach(function (c) {
        c.setAttribute("aria-pressed", c.getAttribute("data-filter-value") === value ? "true" : "false");
      });
      apply();
    };

    filterRoot.addEventListener("click", function (e) {
      var chip = e.target.closest ? e.target.closest("[data-filter-key]") : null;
      if (!chip || !filterRoot.contains(chip)) return;
      choose(chip.getAttribute("data-filter-key"), chip.getAttribute("data-filter-value"));
    });

    if (reset) {
      reset.addEventListener("click", function () { choose("pillar", "all"); choose("sector", "all"); });
    }

    try {
      var params = new URLSearchParams(window.location.search);
      ["pillar", "sector"].forEach(function (k) {
        var v = params.get(k);
        if (v && filterRoot.querySelector('[data-filter-key="' + k + '"][data-filter-value="' + v + '"]')) choose(k, v);
      });
    } catch (err) { /* filters simply start unset */ }

    apply();
  }

  /* ---- 8. Enquiry form ------------------------------------------------- */
  var form = document.querySelector("[data-enquiry-form]");
  if (form) {
    var status = form.querySelector(".form-status");
    form.addEventListener("submit", function (e) {
      if (form.getAttribute("data-endpoint")) return;   // configured provider handles the POST
      e.preventDefault();
      if (!form.reportValidity()) return;
      var d = new FormData(form), mailto = form.getAttribute("data-mailto");
      var body = ["Name: " + (d.get("name") || ""),
                  "Organisation: " + (d.get("organisation") || ""),
                  "Email: " + (d.get("email") || ""),
                  "Enquiry type: " + (d.get("enquiry_type") || ""), "",
                  (d.get("message") || "")].join("\n");
      window.location.href = "mailto:" + mailto +
        "?subject=" + encodeURIComponent("Website enquiry — " + (d.get("enquiry_type") || "General")) +
        "&body=" + encodeURIComponent(body);
      if (status) {
        status.setAttribute("data-state", "ok");
        status.textContent = "Your email client is opening with the message ready to send. If nothing happens, write to " + mailto + " directly.";
      }
    });
  }

  /* ---- 9. Year + active nav ------------------------------------------- */
  slice(document.querySelectorAll("[data-year]")).forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
  var path = window.location.pathname.replace(/index\.html$/, "");
  slice(document.querySelectorAll("[data-nav-match]")).forEach(function (a) {
    var m = a.getAttribute("data-nav-match");
    if (m && m !== "/" && path.indexOf(m) > -1) a.classList.add("is-active");
  });
})();
