// "More on GitHub": lists my public repositories straight from the GitHub API,
// so a new repository shows up on the site without editing any HTML.
(function () {
  var USER = "edermendes2016";
  var LIMIT = 6; // how many repositories the home page shows
  // Repositories that never appear in this list: this site and the featured project.
  // Add a name here to hide a repository, or give it the GitHub topic "no-portfolio".
  var EXCLUDE = ["portfolio", "langchain-local-agent", "portfolio-langchain-local-agent"];
  var CACHE_KEY = "repos-cache-v1";
  var CACHE_MS = 60 * 60 * 1000; // one hour, to stay far below GitHub's rate limit

  var list = document.getElementById("repo-list");
  if (!list) return;
  var root = document.documentElement;
  var repos = null;
  var failed = false;

  var TEXT = {
    en: { loading: "Loading repositories…", error: "Couldn't load the list right now.", none: "No description yet.", updated: "Updated", code: "Code", site: "Live site" },
    pt: { loading: "Carregando repositórios…", error: "Não foi possível carregar a lista agora.", none: "Ainda sem descrição.", updated: "Atualizado em", code: "Código", site: "Site" }
  };

  function lang() { return root.lang === "pt-BR" ? "pt" : "en"; }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function formatDate(iso, l) {
    try {
      return new Date(iso).toLocaleDateString(l === "pt" ? "pt-BR" : "en-US", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) { return iso.slice(0, 10); }
  }


  function render() {
    var l = lang(), t = TEXT[l];
    list.innerHTML = "";
    list.setAttribute("aria-busy", repos || failed ? "false" : "true");
    if (failed) { list.appendChild(el("li", "repo-status", t.error)); return; }
    if (!repos) { list.appendChild(el("li", "repo-status", t.loading)); return; }

    repos.forEach(function (r) {
      var li = el("li", "card repo");
      var h = el("h3");
      var a = el("a", null, r.name);
      a.href = r.html_url; a.target = "_blank"; a.rel = "noopener";
      h.appendChild(a);
      li.appendChild(h);
      li.appendChild(el("p", r.description ? null : "repo-empty", r.description || t.none));

      var meta = el("div", "repo-meta");
      if (r.language) meta.appendChild(el("span", "repo-lang", r.language));
      var time = el("time", null, t.updated + " " + formatDate(r.pushed_at, l));
      time.dateTime = r.pushed_at;
      meta.appendChild(time);
      li.appendChild(meta);

      var links = el("div", "links");
      var code = el("a", "btn", t.code);
      code.href = r.html_url; code.target = "_blank"; code.rel = "noopener";
      links.appendChild(code);
      if (r.homepage) {
        var site = el("a", "btn", t.site);
        site.href = /^https?:\/\//.test(r.homepage) ? r.homepage : "https://" + r.homepage;
        site.target = "_blank"; site.rel = "noopener";
        links.appendChild(site);
      }
      li.appendChild(links);
      list.appendChild(li);
    });
  }

  function keep(r) {
    return !r.fork && !r.archived && !r.private &&
      EXCLUDE.indexOf(r.name) === -1 &&
      (r.topics || []).indexOf("no-portfolio") === -1;
  }

  function use(data) {
    repos = data.filter(keep)
      .sort(function (a, b) { return b.pushed_at < a.pushed_at ? -1 : 1; })
      .slice(0, LIMIT);
    render();
  }

  render();

  try {
    var cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    if (cached && Date.now() - cached.at < CACHE_MS) { use(cached.data); return watchLang(); }
  } catch (e) {}

  fetch("https://api.github.com/users/" + USER + "/repos?per_page=100&sort=pushed", {
    headers: { Accept: "application/vnd.github+json" }
  })
    .then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); })
    .then(function (data) {
      // Keep only the fields we use, so the cache stays small.
      var slim = data.map(function (r) {
        return { name: r.name, html_url: r.html_url, description: r.description, language: r.language,
          homepage: r.homepage, pushed_at: r.pushed_at, fork: r.fork, archived: r.archived,
          private: r.private, topics: r.topics };
      });
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: slim })); } catch (e) {}
      use(slim);
    })
    .catch(function () { failed = true; render(); });

  watchLang();

  // Re-render when the EN / PT button changes the page language.
  function watchLang() {
    new MutationObserver(render).observe(root, { attributes: true, attributeFilter: ["lang"] });
  }
})();
