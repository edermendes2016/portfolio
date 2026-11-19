// Theme toggle: remembers the visitor's choice, falls back to the OS setting.
(function () {
  var root = document.documentElement;
  var btn = document.querySelector(".theme-toggle");
  function current() {
    return root.dataset.theme ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  function apply(theme) {
    root.dataset.theme = theme;
    if (btn) btn.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }
  apply(current());
  if (btn) btn.addEventListener("click", function () {
    var next = current() === "dark" ? "light" : "dark";
    apply(next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  // Mobile menu
  var menuBtn = document.querySelector(".menu-toggle");
  var links = document.querySelector(".nav-links");
  if (menuBtn && links) {
    menuBtn.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open);
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { links.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }
    });
  }

  // Profile links ("Follow" button on small screens)
  var followBtn = document.querySelector(".follow-toggle");
  var urls = document.getElementById("author-urls");
  if (followBtn && urls) {
    followBtn.addEventListener("click", function () {
      var open = urls.classList.toggle("open");
      followBtn.setAttribute("aria-expanded", open);
    });
    document.addEventListener("click", function (e) {
      if (!urls.classList.contains("open") || followBtn.contains(e.target) || urls.contains(e.target)) return;
      urls.classList.remove("open"); followBtn.setAttribute("aria-expanded", "false");
    });
  }

  // Language toggle: English is the default; Portuguese text lives in data-pt attributes.
  var langBtn = document.querySelector(".lang-toggle");
  var nodes = Array.prototype.slice.call(document.querySelectorAll("[data-pt]"));
  nodes.forEach(function (el) { el.dataset.en = el.innerHTML; });
  function setLang(lang) {
    var pt = lang === "pt";
    nodes.forEach(function (el) { el.innerHTML = pt ? el.dataset.pt : el.dataset.en; });
    root.lang = pt ? "pt-BR" : "en";
    if (langBtn) {
      langBtn.textContent = pt ? "EN" : "PT";
      langBtn.lang = pt ? "en" : "pt-BR";
      var label = pt ? "View in English" : "Ver em português";
      langBtn.setAttribute("aria-label", label);
      langBtn.title = label;
    }
  }
  var savedLang = null;
  try { savedLang = localStorage.getItem("lang"); } catch (e) {}
  if (savedLang === "pt") setLang("pt");
  if (langBtn) langBtn.addEventListener("click", function () {
    var next = root.lang === "pt-BR" ? "en" : "pt";
    setLang(next);
    try { localStorage.setItem("lang", next); } catch (e) {}
  });

  // Background music: an original koto, shakuhachi and taiko loop (assets/audio).
  // Off by default; it only plays after a click, at a low volume.
  var nav = document.querySelector(".nav");
  var script = document.currentScript || document.querySelector('script[src$="main.js"]');
  if (nav && script && window.Audio) {
    var audio = null;
    var music = document.createElement("button");
    music.type = "button";
    music.className = "icon-btn music-toggle";
    music.setAttribute("aria-pressed", "false");
    music.innerHTML =
      '<svg class="play" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>' +
      '<svg class="pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
    function musicLabel() {
      var pt = root.lang === "pt-BR", on = music.getAttribute("aria-pressed") === "true";
      var label = on ? (pt ? "Pausar a música" : "Pause music") : (pt ? "Tocar música de fundo" : "Play background music");
      music.setAttribute("aria-label", label); music.title = label;
    }
    music.addEventListener("click", function () {
      if (!audio) {
        audio = new Audio(new URL("../audio/samurai-theme.mp3", script.src).href);
        audio.loop = true; audio.volume = 0.25;
        audio.addEventListener("pause", function () { music.setAttribute("aria-pressed", "false"); musicLabel(); });
        audio.addEventListener("play", function () { music.setAttribute("aria-pressed", "true"); musicLabel(); });
      }
      if (audio.paused) { var p = audio.play(); if (p && p.catch) p.catch(function () {}); } else audio.pause();
    });
    nav.insertBefore(music, nav.querySelector(".lang-toggle"));
    musicLabel();
    new MutationObserver(musicLabel).observe(root, { attributes: true, attributeFilter: ["lang"] });
  }

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
