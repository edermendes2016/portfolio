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

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
