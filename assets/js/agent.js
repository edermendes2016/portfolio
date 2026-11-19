// Eder's agent: runs entirely in the browser, with no API and no cost.
//
// - Chat in the About section: answers questions such as "Does Eder know C#?" from
//   assets/data/kb.json, built by .agentPessoalEder/build_kb.py from the résumé (that folder
//   stays on Eder's computer, out of git). The agent speaks as Monkey D. Luffy, Eder's agent,
//   handles small talk, and answers in the language of the question (PT or EN).
//   Skill questions are answered from the jobs and projects linked to that skill; other
//   questions are matched to the closest résumé passage with TF-IDF. When nothing matches,
//   it says it doesn't know instead of guessing.
// - Clickable skills: each tag in the Skills section opens what Eder did with it, the
//   projects that use it and his public GitHub repositories in that language.
// - Welcome agent: on the first visit, a bubble offers a guided tour of his story.
(function () {
  "use strict";
  var root = document.documentElement;
  var KB_URL = "assets/data/kb.json";
  var REPOS_CACHE = "repos-cache-v1"; // shared with repos.js
  var INTRO_KEY = "agent-intro-v1";
  var MIN_SCORE = 0.14; // below this TF-IDF score the agent says it doesn't know

  var answerLang = null; // set while answering, so the reply follows the question's language
  function lang() { return answerLang || (root.lang === "pt-BR" ? "pt" : "en"); }
  function pick(obj) { return obj ? (obj[lang()] || obj.en || "") : ""; }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function link(href, text) {
    var a = el("a", null, text);
    a.href = href; a.target = "_blank"; a.rel = "noopener";
    return a;
  }
  function store(key, value) {
    try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key, value); } catch (e) { return null; }
  }
  function onLangChange(fn) {
    new MutationObserver(fn).observe(root, { attributes: true, attributeFilter: ["lang"] });
  }
  function smooth() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"; }

  var T = {
    en: {
      placeholder: "e.g. Does Eder know C#?",
      loading: "Loading Eder's résumé…",
      loadError: "Couldn't load the résumé data. Please reload the page.",
      dontKnow: ["I don't know that from Eder's résumé. It's better to ask him directly on LinkedIn.",
        "That one isn't in Eder's résumé, so I'd rather not guess. He'll gladly answer on LinkedIn.",
        "I only know what's in Eder's résumé, and that isn't there. Ask him on LinkedIn!"],
      notListed: ["{x} isn't on Eder's résumé yet.", "I didn't find {x} in Eder's résumé.", "{x} isn't listed among Eder's skills for now."],
      tryAsking: "You can ask, for example:",
      askHim: "To be sure, ask him on LinkedIn: https://www.linkedin.com/in/eder-mendes-amaral/",
      yes: "Yes.",
      usedAt: "He has used {s} professionally for {d}, in: {c}.",
      usedAtShort: "He has used {s} professionally at {c} ({d}).",
      inProjects: "Projects with {s}:",
      onlyProjects: "Yes, in his own projects (not in a job yet):",
      onlyCerts: "He has studied {s} in:",
      listedOnly: "{s} is listed in the skills on his résumé, but no job or project there describes how he used it. It's best to ask him directly.",
      example: "For example:",
      repos: "Public repositories in {s}:",
      updated: "updated",
      years: function (n) { return n < 1 ? "less than a year" : n === 1 ? "about 1 year" : "about " + n + " years"; },
      since: "since",
      expIntro: "Eder's career so far:",
      projIntro: "Projects on his GitHub:",
      certIntro: "Certifications and courses:",
      source: "Source",
      sources: { experience: "experience", project: "project", certification: "certifications", education: "education", fact: "résumé" },
      code: "Code",
      skillTitle: "{s}",
      skillJobs: "Where he used it",
      skillProjects: "Projects",
      skillCerts: "Studied in",
      skillRepos: "More repositories in this language",
      skillNone: "Listed on his résumé. No job or project there describes it yet.",
      ask: "Ask the agent about {s}",
      close: "Close",
      tourStart: "Starting the guided tour…"
    },
    pt: {
      placeholder: "ex.: O Eder sabe C#?",
      loading: "Carregando o currículo do Eder…",
      loadError: "Não foi possível carregar os dados do currículo. Recarregue a página.",
      dontKnow: ["Não sei responder isso com base no currículo do Eder. O melhor é perguntar direto para ele no LinkedIn.",
        "Essa não está no currículo do Eder, então prefiro não chutar. Ele responde com prazer no LinkedIn.",
        "Eu só sei o que está no currículo do Eder, e isso não está lá. Pergunte para ele no LinkedIn!"],
      notListed: ["{x} ainda não está no currículo do Eder.", "Não encontrei {x} no currículo do Eder.", "{x} não aparece entre as habilidades do Eder por enquanto."],
      tryAsking: "Você pode perguntar, por exemplo:",
      askHim: "Para ter certeza, pergunte para ele no LinkedIn: https://www.linkedin.com/in/eder-mendes-amaral/",
      yes: "Sim.",
      usedAt: "Ele usa {s} profissionalmente há {d}, em: {c}.",
      usedAtShort: "Ele usou {s} profissionalmente na {c} ({d}).",
      inProjects: "Projetos com {s}:",
      onlyProjects: "Sim, em projetos próprios (ainda não em um emprego):",
      onlyCerts: "Ele estudou {s} em:",
      listedOnly: "{s} está nas competências do currículo dele, mas nenhuma experiência ou projeto descreve como ele usou. O melhor é perguntar direto para ele.",
      example: "Por exemplo:",
      repos: "Repositórios públicos em {s}:",
      updated: "atualizado em",
      years: function (n) { return n < 1 ? "menos de um ano" : n === 1 ? "cerca de 1 ano" : "cerca de " + n + " anos"; },
      since: "desde",
      expIntro: "A trajetória do Eder até agora:",
      projIntro: "Projetos no GitHub dele:",
      certIntro: "Certificações e cursos:",
      source: "Fonte",
      sources: { experience: "experiência", project: "projeto", certification: "certificações", education: "formação", fact: "currículo" },
      code: "Código",
      skillTitle: "{s}",
      skillJobs: "Onde ele usou",
      skillProjects: "Projetos",
      skillCerts: "Estudou em",
      skillRepos: "Outros repositórios nessa linguagem",
      skillNone: "Está no currículo, mas nenhuma experiência ou projeto descreve o uso ainda.",
      ask: "Perguntar ao agente sobre {s}",
      close: "Fechar",
      tourStart: "Começando o tour guiado…"
    }
  };
  function t(key) { return T[lang()][key]; }
  // Picks the next variant of a list without repeating until all were used.
  var queues = {};
  function rotate(key, list) {
    if (!list || !list.length) return "";
    var q = queues[key];
    if (!q || !q.length) {
      q = list.map(function (_, i) { return i; });
      for (var i = q.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = q[i]; q[i] = q[j]; q[j] = tmp; }
      if (queues["last:" + key] === q[0] && q.length > 1) q.push(q.shift());
      queues[key] = q;
    }
    var idx = q.shift();
    queues["last:" + key] = idx;
    return list[idx];
  }
  function variant(key) { return rotate(lang() + ":" + key, T[lang()][key]); }

  // Language of the question: Portuguese or English words, else the page language.
  var PT_WORDS = /\b(o|a|ele|ela|voce|vc|sabe|conhece|qual|quais|quem|como|onde|seu|sua|nome|oi+e?|ola|tchau|obrigad\w*|valeu|tudo|bem|nao|sim|de|do|da|em|com|para|pra|trabalh\w*|tem|e|ja|mora|fala|ingles|projetos?|experiencia)\b/g;
  var EN_WORDS = /\b(he|his|him|does|do|know|knows|what|who|where|how|your|name|hi|hello|hey|bye|thanks|thank|you|is|are|the|of|in|with|has|have|worked|live|speak|english|projects?|experience)\b/g;
  function detectLang(text) {
    var n = String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    var pt = (n.match(PT_WORDS) || []).length, en = (n.match(EN_WORDS) || []).length;
    return pt > en ? "pt" : en > pt ? "en" : null;
  }

  function fill(str, map) { return str.replace(/\{(\w)\}/g, function (_, k) { return map[k]; }); }

  // ---------- Knowledge base ----------
  var kbPromise = null;
  function loadKb() {
    if (!kbPromise) {
      kbPromise = fetch(KB_URL).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(prepare);
      kbPromise.catch(function () { kbPromise = null; });
    }
    return kbPromise;
  }

  function prepare(kb) {
    kb.skillById = {}; kb.expById = {}; kb.projById = {};
    kb.skills.forEach(function (s) { kb.skillById[s.id] = s; });
    kb.experiences.forEach(function (e) { kb.expById[e.id] = e; });
    kb.projects.forEach(function (p) { kb.projById[p.id] = p; });
    kb.stop = {};
    kb.tokenizer.stopwords.forEach(function (w) { kb.stop[w] = true; });
    return kb;
  }

  // Same rules as build_kb.py, so questions and passages are cut into the same words.
  function normalize(kb, text) {
    text = String(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    kb.tokenizer.replacements.forEach(function (r) { text = text.split(r[0]).join(r[1]); });
    return text;
  }
  function tokens(kb, text) {
    return normalize(kb, text).split(/[^a-z0-9]+/).filter(function (w) {
      return w.length >= 2 && !kb.stop[w];
    }).map(function (w) { return w.length > 4 && w.charAt(w.length - 1) === "s" ? w.slice(0, -1) : w; });
  }

  function hasSeq(list, seq) {
    for (var i = 0; i + seq.length <= list.length; i++) {
      var ok = true;
      for (var j = 0; j < seq.length; j++) if (list[i + j] !== seq[j]) { ok = false; break; }
      if (ok) return i;
    }
    return -1;
  }

  // Skills named in the question. Longer names win ("azure devops" over "azure").
  function findSkills(kb, toks) {
    var hits = [];
    kb.skills.forEach(function (s) {
      var best = null;
      s.aliases.forEach(function (a) {
        var at = hasSeq(toks, a);
        if (at >= 0 && (!best || a.length > best.len)) best = { at: at, len: a.length };
      });
      if (best) hits.push({ skill: s, at: best.at, len: best.len });
    });
    hits = hits.filter(function (h) {
      return !hits.some(function (o) { return o !== h && o.len > h.len && h.at >= o.at && h.at + h.len <= o.at + o.len; });
    });
    hits.sort(function (a, b) { return a.at - b.at; });
    var seen = {};
    return hits.map(function (h) { return h.skill; }).filter(function (s) { return seen[s.id] ? false : (seen[s.id] = true); });
  }

  function search(kb, toks) {
    var q = {}, norm = 0;
    toks.forEach(function (w) { if (kb.idf[w]) q[w] = (q[w] || 0) + 1; });
    Object.keys(q).forEach(function (w) { q[w] = (1 + Math.log(q[w])) * kb.idf[w]; norm += q[w] * q[w]; });
    norm = Math.sqrt(norm) || 1;
    return kb.docs.map(function (d) {
      var score = 0;
      for (var w in q) if (d.vec[w]) score += (q[w] / norm) * d.vec[w];
      return { doc: d, score: score };
    }).filter(function (r) { return r.score > 0; }).sort(function (a, b) { return b.score - a.score; });
  }

  // ---------- GitHub repositories (live, shared cache with repos.js) ----------
  var reposPromise = null;
  function loadRepos() {
    if (reposPromise) return reposPromise;
    try {
      var cached = JSON.parse(sessionStorage.getItem(REPOS_CACHE) || "null");
      if (cached && Date.now() - cached.at < 3600000) return (reposPromise = Promise.resolve(cached.data));
    } catch (e) {}
    reposPromise = fetch("https://api.github.com/users/edermendes2016/repos?per_page=100&sort=pushed", {
      headers: { Accept: "application/vnd.github+json" }
    }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var slim = data.map(function (r) {
          return { name: r.name, html_url: r.html_url, description: r.description, language: r.language, homepage: r.homepage,
            pushed_at: r.pushed_at, fork: r.fork, archived: r.archived, private: r.private, topics: r.topics };
        });
        try { sessionStorage.setItem(REPOS_CACHE, JSON.stringify({ at: Date.now(), data: slim })); } catch (e) {}
        return slim;
      })
      .catch(function () { return []; });
    return reposPromise;
  }
  function repoByName(repos, name) {
    name = String(name).toLowerCase();
    for (var i = 0; i < repos.length; i++) if (repos[i].name.toLowerCase() === name) return repos[i];
    return null;
  }
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString(lang() === "pt" ? "pt-BR" : "en-US", { day: "numeric", month: "short", year: "numeric" }); }
    catch (e) { return String(iso).slice(0, 10); }
  }
  function yearsOf(s) { return s.months < 12 ? 0 : Math.floor(s.months / 12); }
  function period(e) { var a = e.start.slice(0, 4), b = e.end.slice(0, 4); return a === b ? a : a + "–" + b; }
  function skillName(s) { return lang() === "pt" ? s.name_pt : s.name; }

  // Projects and extra repositories for one skill, with live "updated" dates when GitHub answers.
  function skillLinks(kb, s, repos) {
    var projects = s.projects.map(function (id) {
      var p = kb.projById[id], r = repoByName(repos, p.repo);
      return { name: pick(p.name), url: r ? r.html_url : kb.person.github + "/" + p.repo, updated: r && r.pushed_at };
    });
    projects.sort(function (a, b) { return String(b.updated || "").localeCompare(String(a.updated || "")); });
    var own = {};
    s.projects.forEach(function (id) { own[kb.projById[id].repo.toLowerCase()] = true; });
    var extra = repos.filter(function (r) {
      return !r.fork && !r.archived && !r.private && !own[r.name.toLowerCase()] &&
        (r.topics || []).indexOf("no-portfolio") === -1 &&
        (s.github.indexOf(r.language) !== -1 || (r.topics || []).indexOf(s.id) !== -1);
    }).slice(0, 3).map(function (r) { return { name: r.name, url: r.html_url, updated: r.pushed_at }; });
    return { projects: projects, extra: extra };
  }

  function linkList(items) {
    var ul = el("ul", "agent-links");
    items.forEach(function (it) {
      var li = el("li");
      li.appendChild(link(it.url, it.name));
      if (it.updated) li.appendChild(el("span", "agent-meta", " · " + t("updated") + " " + fmtDate(it.updated)));
      ul.appendChild(li);
    });
    return ul;
  }

  function companies(kb, s) {
    var names = s.experiences.map(function (id) { return pick(kb.expById[id].org); });
    if (names.length < 2) return names.join("");
    return names.slice(0, -1).join(", ") + (lang() === "pt" ? " e " : " and ") + names[names.length - 1];
  }

  // Best passage that mentions the skill, as concrete evidence.
  function evidence(kb, s) {
    var refs = {};
    s.experiences.concat(s.projects).forEach(function (id) { refs[id] = true; });
    var best = null;
    kb.docs.forEach(function (d) {
      if (!refs[d.ref] || (d.kind !== "experience" && d.kind !== "project")) return;
      var score = 0;
      s.aliases.forEach(function (a) { a.forEach(function (w) { if (d.vec[w]) score = Math.max(score, d.vec[w]); }); });
      if (score > 0 && d.kind === "experience") score += 1; // a job is stronger evidence than a side project
      if (score > 0 && (!best || score > best.score)) best = { doc: d, score: score };
    });
    return best && pick(best.doc);
  }

  // ---------- Answers ----------
  // Each answer is a list of DOM nodes, so links stay clickable and text is never parsed as HTML.
  function answerSkill(kb, s, repos, short) {
    var out = [], name = skillName(s), years = yearsOf(s);
    if (s.experiences.length) {
      var d = t("years")(years) + (s.since ? " (" + t("since") + " " + s.since + ")" : "");
      out.push(el("p", null, (short ? "" : t("yes") + " ") + fill(t("usedAt"), { s: name, d: d, c: companies(kb, s) })));
      var ex = !short && evidence(kb, s);
      if (ex) out.push(el("p", "agent-quote", t("example") + " " + ex));
    } else if (s.projects.length) {
      out.push(el("p", null, (short ? name + ": " : "") + t("onlyProjects")));
    } else if (s.certifications.length) {
      out.push(el("p", null, fill(t("onlyCerts"), { s: name })));
    } else {
      out.push(el("p", null, fill(t("listedOnly"), { s: name })));
    }
    var links = skillLinks(kb, s, repos);
    if (links.projects.length) {
      if (s.experiences.length) out.push(el("p", "agent-sub", fill(t("inProjects"), { s: name })));
      out.push(linkList(links.projects));
    }
    if (!s.experiences.length && s.certifications.length) {
      out.push(el("p", "agent-sub", (s.projects.length ? fill(t("onlyCerts"), { s: name }) + " " : "") + s.certifications.map(function (id) {
        var d = kb.docs.filter(function (x) { return x.id === "cert:" + id; })[0];
        return d ? pick(d) : id;
      }).join(" ")));
    }
    if (!short && links.extra.length) {
      out.push(el("p", "agent-sub", fill(t("repos"), { s: name })));
      out.push(linkList(links.extra));
    }
    return out;
  }

  function answerList(kb, kind) {
    var out = [];
    if (kind === "experience") {
      out.push(el("p", null, t("expIntro")));
      var ul = el("ul", "agent-links");
      kb.experiences.forEach(function (e) {
        ul.appendChild(el("li", null, period(e) + ": " + pick(e.role) + " · " + pick(e.org)));
      });
      out.push(ul);
    } else if (kind === "projects") {
      out.push(el("p", null, t("projIntro")));
      out.push(linkList(kb.projects.map(function (p) { return { name: pick(p.name), url: kb.person.github + "/" + p.repo }; })));
    } else {
      out.push(el("p", null, t("certIntro")));
      var cl = el("ul", "agent-links");
      kb.docs.filter(function (d) { return d.kind === "certification"; }).forEach(function (d) { cl.appendChild(el("li", null, pick(d))); });
      out.push(cl);
    }
    return out;
  }

  function sourceLabel(kb, d) {
    var s = t("sources")[d.kind] || "";
    if (d.kind === "experience") s += " · " + pick(kb.expById[d.ref].org);
    if (d.kind === "project") s += " " + pick(kb.projById[d.ref].name);
    return t("source") + ": " + s;
  }

  var ASKS_ABOUT = /\b(sabe|conhece|domina|manja|programa em|experiencia (com|em)|trabalh\w* com|usa|usou|mexe com|know|knows|experience (with|in)|worked with|work with|uses?|used|familiar with|skilled in)\s+(.+)$/;
  var FILLER = /^((o|a)\s+)?(eder|ele|ela|he|him)?\s*(sabe|conhece|tem)?\s*(de|em|com|o|a|the)?\s+/;

  // Small talk: who the agent is, greetings, thanks and goodbyes, in PT and EN.
  var SMALL = [
    ["identity", /\b(seu nome|teu nome|como (voce|vc|tu) (se )?chama|quem (e|eh) (voce|vc|tu)|quem e o agente|voce e quem|what'?s your name|what is your name|your name|who are you|who r u|are you a (bot|robot|ai))\b/],
    ["how_are_you", /^(e ai,? )?(tudo bem|td bem|tudo bom|como vai|como voce esta|como vc ta|beleza|blz|suave|how are you|how'?s it going|how are u|what'?s up|sup)( com voce| contigo)?$/],
    ["thanks", /^(muito )?(obrigad[oa]|obg|brigad[oa]|valeu|vlw|thanks|thank you|thank u|thx|ty)( (luffy|agente|mesmo|demais|a lot|so much))*$/],
    ["farewells", /^(tchau|tchauzinho|xau|adeus|ate (mais|logo|breve|a proxima)|falou|flw|bye( bye)?|bye-bye|goodbye|good bye|see (you|ya)( later)?|cya|later)( (luffy|agente|pessoal|everyone))*$/],
    ["greetings", /^(oi+e?|ola+|hey+|hi+|hello+|e ?ai|eae|salve|bom dia|boa tarde|boa noite|good (morning|afternoon|evening)|hola|yo)( (luffy|agente|tudo bem|td bem|there|everyone|pessoal))*$/]
  ];
  function smallTalk(kb, norm) {
    var text = norm.replace(/[!?.,;:]+/g, " ").replace(/\s+/g, " ").trim();
    var persona = kb.persona || {};
    for (var i = 0; i < SMALL.length; i++) {
      if (SMALL[i][1].test(text) && persona[SMALL[i][0]]) return pick(rotate(SMALL[i][0], persona[SMALL[i][0]]));
    }
    return null;
  }

  function answer(kb, question, repos) {
    var norm = normalize(kb, question).replace(/[?!.]+\s*$/, "").trim();
    var toks = tokens(kb, question);

    var talk = smallTalk(kb, norm);
    if (talk) return { nodes: [el("p", null, talk)] };

    if (/^(sim|s|yes|y|ok|bora|vamos)$|\b(tour|guia|guie|guiad\w*|navegacao direcionada|guide me|show me around)\b/.test(norm)) {
      return { tour: true, nodes: [el("p", null, t("tourStart"))] };
    }

    var skills = findSkills(kb, toks);
    if (skills.length === 1) return { nodes: answerSkill(kb, skills[0], repos, false) };
    if (skills.length > 1) {
      var nodes = [];
      skills.slice(0, 4).forEach(function (s) {
        nodes.push(el("p", "agent-skill-name", skillName(s)));
        nodes = nodes.concat(answerSkill(kb, s, repos, true));
      });
      return { nodes: nodes };
    }

    if (/\b(onde (ele )?trabalh\w*|empresa\w*|emprego\w*|carreira|historia|trajetoria|experiencias? profissiona\w*|worked|companies|employers|jobs|career|history)\b/.test(norm)) {
      return { nodes: answerList(kb, "experience") };
    }
    if (/\b(projeto\w*|projects?|portfolio|repositorio\w*|repos?|github)\b/.test(norm)) return { nodes: answerList(kb, "projects") };
    if (/\b(certifica\w*|certification\w*|cursos?|courses?)\b/.test(norm)) return { nodes: answerList(kb, "certs") };

    if (/\b(contrat\w*|hire|hiring|diferencia\w*|destaque|strengths?|pontos? fortes?)\b/.test(norm)) {
      var facts = kb.docs.filter(function (d) { return d.id === "fact:summary" || d.id === "fact:goal"; });
      return { nodes: facts.map(function (d) { return el("p", null, pick(d)); }) };
    }

    var results = search(kb, toks);
    var top = results[0];

    // "Does he know X?" where X is nothing on the résumé.
    var m = norm.match(ASKS_ABOUT);
    if (m && (!top || top.score < 0.3)) {
      var thing = m[m.length - 1].replace(FILLER, "").replace(/^(de|em|com|o|a|the)\s+/, "").trim();
      var original = question.replace(/[?!.]+\s*$/, "").trim();
      var tail = original.slice(Math.max(0, original.length - thing.length)).trim();
      if (thing && thing.split(/\s+/).length <= 4) {
        var x = tail || thing;
        return { nodes: [
          el("p", null, fill(variant("notListed"), { x: x.charAt(0).toUpperCase() + x.slice(1) }) + " " + pick(rotate("learning", kb.learning))),
          el("p", "agent-sub", t("askHim"))
        ] };
      }
    }

    if (top && top.score >= MIN_SCORE) {
      var out = [el("p", null, pick(top.doc))];
      var second = results[1];
      if (second && second.score >= top.score * 0.85 && second.doc.ref !== top.doc.ref) out.push(el("p", null, pick(second.doc)));
      out.push(el("p", "agent-source", sourceLabel(kb, top.doc)));
      return { nodes: out };
    }

    var fallback = [el("p", null, variant("dontKnow")), el("p", "agent-sub", t("tryAsking"))];
    var ul = el("ul", "agent-links");
    var sug = kb.suggestions[lang()];
    var start = Math.floor(Math.random() * sug.length);
    for (var k = 0; k < 3; k++) ul.appendChild(el("li", null, sug[(start + k * 7) % sug.length]));
    fallback.push(ul);
    return { nodes: fallback };
  }

  // ---------- Chat with autocomplete ----------
  function initChat() {
    var box = document.getElementById("ask");
    if (!box) return;
    var log = box.querySelector(".ask-log");
    var form = box.querySelector(".ask-form");
    var input = form.querySelector("input");
    var list = document.getElementById("ask-complete");
    var active = -1, options = [];

    function bubble(cls, nodes) {
      var div = el("div", "ask-msg " + cls);
      if (typeof nodes === "string") div.textContent = nodes;
      else nodes.forEach(function (n) { div.appendChild(n); });
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
      return div;
    }

    function ask(question) {
      question = String(question || "").trim().slice(0, 200);
      if (!question) return;
      closeList();
      input.value = "";
      bubble("user", question);
      var pending = bubble("bot typing", t("loading"));
      Promise.all([loadKb(), loadRepos()]).then(function (res) {
        answerLang = detectLang(question);
        var a;
        try { a = answer(res[0], question, res[1]); } finally { answerLang = null; }
        pending.className = "ask-msg bot";
        pending.textContent = "";
        a.nodes.forEach(function (n) { pending.appendChild(n); });
        log.scrollTop = log.scrollHeight;
        if (a.tour) setTimeout(function () { tour.start(); }, 400);
      }).catch(function () {
        pending.className = "ask-msg bot error";
        pending.textContent = t("loadError");
      });
    }
    chat.ask = function (q) { box.scrollIntoView({ behavior: smooth(), block: "center" }); ask(q); };

    // Autocomplete: suggestions whose words contain what is typed, best matches first.
    function closeList() { list.hidden = true; list.textContent = ""; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); active = -1; options = []; }
    function renderList(kb) {
      var q = normalize(kb, input.value).trim();
      if (q.length < 2) return closeList();
      var words = q.split(/\s+/);
      var scored = [];
      kb.suggestions[lang()].forEach(function (s) {
        var n = normalize(kb, s), score = 0;
        for (var i = 0; i < words.length; i++) { var at = n.indexOf(words[i]); if (at < 0) return; score += at === 0 ? 3 : /\s/.test(n.charAt(at - 1)) ? 2 : 1; }
        scored.push({ s: s, score: score - s.length / 100 });
      });
      kb.skills.forEach(function (s) {
        if (s.aliases.some(function (a) { return a.join(" ").indexOf(words[words.length - 1]) === 0; })) {
          var q2 = lang() === "pt" ? "O Eder sabe " + skillName(s) + "?" : "Does Eder know " + skillName(s) + "?";
          if (!scored.some(function (x) { return x.s === q2; })) scored.push({ s: q2, score: 1 });
        }
      });
      scored.sort(function (a, b) { return b.score - a.score; });
      options = scored.slice(0, 6).map(function (x) { return x.s; });
      list.textContent = "";
      if (!options.length) return closeList();
      options.forEach(function (s, i) {
        var li = el("li", "ask-option", s);
        li.id = "ask-opt-" + i; li.setAttribute("role", "option");
        li.addEventListener("mousedown", function (e) { e.preventDefault(); ask(s); });
        list.appendChild(li);
      });
      list.hidden = false; input.setAttribute("aria-expanded", "true"); active = -1;
    }
    function move(step) {
      if (list.hidden || !options.length) return;
      active = (active + step + options.length) % options.length;
      Array.prototype.forEach.call(list.children, function (li, i) { li.setAttribute("aria-selected", i === active ? "true" : "false"); });
      input.setAttribute("aria-activedescendant", "ask-opt-" + active);
    }

    input.addEventListener("input", function () { loadKb().then(renderList).catch(function () {}); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Escape") closeList();
      else if (e.key === "Enter" && active >= 0) { e.preventDefault(); ask(options[active]); }
    });
    input.addEventListener("blur", function () { setTimeout(closeList, 100); });
    input.addEventListener("focus", function () { loadKb().catch(function () {}); });
    form.addEventListener("submit", function (e) { e.preventDefault(); ask(input.value); });
    box.querySelectorAll(".ask-chip").forEach(function (chip) {
      chip.addEventListener("click", function () { ask(chip.textContent); });
    });
    function applyLang() { input.placeholder = t("placeholder"); closeList(); }
    applyLang();
    onLangChange(applyLang);
  }
  var chat = { ask: function () {} };

  // ---------- Clickable skills ----------
  function initSkills() {
    var panel = document.getElementById("skill-panel");
    var buttons = document.querySelectorAll(".skill[data-skill]");
    if (!panel || !buttons.length) return;
    var current = null;

    function render(kb, repos) {
      var s = kb.skillById[current.getAttribute("data-skill")];
      if (!s) return;
      panel.textContent = "";
      var head = el("div", "skill-panel-head");
      head.appendChild(el("h3", null, skillName(s)));
      var x = el("button", "icon-btn skill-close", "×");
      x.type = "button"; x.setAttribute("aria-label", t("close"));
      x.addEventListener("click", close);
      head.appendChild(x);
      panel.appendChild(head);

      if (s.experiences.length) {
        panel.appendChild(el("p", "agent-sub", t("skillJobs") + " · " + t("years")(yearsOf(s)) + (s.since ? ", " + t("since") + " " + s.since : "")));
        var ul = el("ul", "agent-links");
        s.experiences.forEach(function (id) {
          var e = kb.expById[id];
          ul.appendChild(el("li", null, period(e) + ": " + pick(e.role) + " · " + pick(e.org)));
        });
        panel.appendChild(ul);
        var ex = evidence(kb, s);
        if (ex) panel.appendChild(el("p", "agent-quote", ex));
      }
      var links = skillLinks(kb, s, repos);
      if (links.projects.length) {
        panel.appendChild(el("p", "agent-sub", t("skillProjects")));
        panel.appendChild(linkList(links.projects));
      }
      if (s.certifications.length) {
        panel.appendChild(el("p", "agent-sub", t("skillCerts")));
        var cl = el("ul", "agent-links");
        s.certifications.forEach(function (id) {
          var d = kb.docs.filter(function (x) { return x.id === "cert:" + id; })[0];
          if (d) cl.appendChild(el("li", null, pick(d).split(/[.(]/)[0].trim()));
        });
        panel.appendChild(cl);
      }
      if (links.extra.length) {
        panel.appendChild(el("p", "agent-sub", t("skillRepos")));
        panel.appendChild(linkList(links.extra));
      }
      if (!s.experiences.length && !s.projects.length && !s.certifications.length) panel.appendChild(el("p", null, t("skillNone")));

      var askBtn = el("button", "btn skill-ask", fill(t("ask"), { s: skillName(s) }));
      askBtn.type = "button";
      askBtn.addEventListener("click", function () {
        chat.ask(lang() === "pt" ? "O Eder sabe " + skillName(s) + "?" : "Does Eder know " + skillName(s) + "?");
      });
      panel.appendChild(askBtn);
    }

    function open(btn) {
      if (current) current.setAttribute("aria-expanded", "false");
      if (current === btn && !panel.hidden) return close();
      current = btn;
      btn.setAttribute("aria-expanded", "true");
      Promise.all([loadKb(), loadRepos()]).then(function (res) {
        render(res[0], res[1]);
        panel.hidden = false;
        panel.scrollIntoView({ behavior: smooth(), block: "nearest" });
      }).catch(function () { panel.hidden = false; panel.textContent = t("loadError"); });
    }
    function close() {
      panel.hidden = true;
      if (current) { current.setAttribute("aria-expanded", "false"); current.focus(); }
      current = null;
    }

    Array.prototype.forEach.call(buttons, function (b) {
      b.setAttribute("aria-expanded", "false");
      b.setAttribute("aria-controls", "skill-panel");
      b.addEventListener("click", function () { open(b); });
    });
    panel.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    onLangChange(function () { if (current && !panel.hidden) Promise.all([loadKb(), loadRepos()]).then(function (r) { render(r[0], r[1]); }); });
  }

  // ---------- Welcome agent and guided tour ----------
  var STEPS = [
    { target: "#about", en: "This is Eder: a Computer Engineer and Full-Stack developer who has built .NET, C#, Angular and SQL Server systems since 2016, mostly for the public sector and regulated utilities.",
      pt: "Este é o Eder: Engenheiro de Computação e desenvolvedor Full-Stack que constrói sistemas com .NET, C#, Angular e SQL Server desde 2016, principalmente para o setor público e o setor elétrico." },
    { target: "#experience", en: "His story: support analyst in 2015, developer from 2016 migrating legacy systems to ASP.NET Core, microservices for state agencies from 2019, and from 2022 critical systems for a federal electricity regulator, including on-premise AI with RAG.",
      pt: "A história dele: suporte técnico em 2015, desenvolvedor a partir de 2016 migrando sistemas legados para ASP.NET Core, microsserviços para órgãos do estado a partir de 2019 e, desde 2022, sistemas críticos de uma agência reguladora federal do setor elétrico, incluindo IA on-premise com RAG." },
    { target: "#projects", en: "Today he also builds AI and cloud projects. The featured one is a local RAG agent; below it are his latest repositories, straight from GitHub.",
      pt: "Hoje ele também constrói projetos de IA e cloud. O destaque é um agente RAG local; logo abaixo estão os repositórios mais recentes, direto do GitHub." },
    { target: "#skills", en: "Every skill here is clickable: it shows where he used it and the projects behind it. Try one after the tour.",
      pt: "Cada habilidade aqui é clicável: mostra onde ele usou e os projetos por trás. Experimente clicar em uma depois do tour." },
    { target: "#ask", en: "And to ask something specific, use this chat, like \"Does Eder know C#?\". That's it, you know how it works now. Enjoy exploring!",
      pt: "E para perguntar algo específico, use este chat, como \"O Eder sabe C#?\". Pronto, agora você já sabe como funciona. Boa navegação!" }
  ];
  var TT = {
    en: { hello: "Hi, I'm Eder's agent. For a guided visit, just say yes and I'll walk you through his story so far.", yes: "Yes", no: "Not now",
      menu: "How can I help?", tour: "Guided tour", ask: "Ask a question", next: "Next", back: "Back", done: "Done", exit: "Close", open: "Open Eder's agent", step: "{a} of {b}",
      musicHint: "Psst! This site has a soundtrack: a samurai theme by day and a rainy night theme in dark mode. Want to hear it? The \u266A button at the top plays and pauses it.",
      musicPlay: "Play music", musicLater: "Later" },
    pt: { hello: "Olá, eu sou o agente do Eder. Para uma navegação direcionada, basta dizer sim, e eu te guio pela história dele até o momento.", yes: "Sim", no: "Agora não",
      menu: "Como posso ajudar?", tour: "Tour guiado", ask: "Fazer uma pergunta", next: "Próximo", back: "Voltar", done: "Concluir", exit: "Fechar", open: "Abrir o agente do Eder", step: "{a} de {b}",
      musicHint: "Psiu! Este site tem trilha sonora: um tema de samurai de dia e um tema de noite chuvosa no modo escuro. Quer ouvir? O botão \u266A lá no topo toca e pausa.",
      musicPlay: "Tocar música", musicLater: "Depois" }
  };
  function tt(k) { return TT[lang()][k]; }

  var tour = { start: function () {} };
  function initAgent() {
    var wrap = el("div", "agent");
    var bubbleEl = el("div", "agent-bubble");
    bubbleEl.setAttribute("role", "dialog");
    bubbleEl.setAttribute("aria-live", "polite");
    bubbleEl.hidden = true;
    var launcher = el("button", "agent-launcher");
    launcher.type = "button";
    launcher.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 13h.01M15 13h.01M9.5 17h5"/><circle cx="12" cy="3.5" r="1"/></svg>';
    wrap.appendChild(bubbleEl);
    wrap.appendChild(launcher);
    document.body.appendChild(wrap);

    var mode = null, step = 0, focused = null;

    function button(label, cls, fn) {
      var b = el("button", "btn " + (cls || ""), label);
      b.type = "button"; b.addEventListener("click", fn);
      return b;
    }
    function unfocus() { if (focused) focused.classList.remove("agent-focus"); focused = null; }
    // Mention the music until the visitor clicks it once (stored by main.js), once per page view.
    var musicHinted = false;
    function wantMusicHint() { return !musicHinted && window.EderMusic && !window.EderMusic.clicked(); }
    function hide() {
      var was = mode;
      bubbleEl.hidden = true; mode = null; unfocus(); launcher.setAttribute("aria-expanded", "false");
      if (was && was !== "music" && wantMusicHint()) setTimeout(function () { if (!mode && wantMusicHint()) show("music"); }, 700);
    }
    function finishIntro() { store(INTRO_KEY, "1"); }

    function show(m) {
      mode = m;
      bubbleEl.textContent = "";
      bubbleEl.hidden = false;
      launcher.setAttribute("aria-expanded", "true");
      var actions = el("div", "agent-actions");
      if (m === "intro") {
        bubbleEl.setAttribute("aria-label", tt("open"));
        bubbleEl.appendChild(el("p", null, tt("hello")));
        actions.appendChild(button(tt("yes"), "agent-primary", function () { finishIntro(); go(0); }));
        actions.appendChild(button(tt("no"), "", function () { finishIntro(); hide(); }));
      } else if (m === "music") {
        musicHinted = true;
        bubbleEl.setAttribute("aria-label", tt("open"));
        bubbleEl.appendChild(el("p", null, tt("musicHint")));
        actions.appendChild(button(tt("musicPlay"), "agent-primary", function () { hide(); if (window.EderMusic) window.EderMusic.play(); }));
        actions.appendChild(button(tt("musicLater"), "", hide));
      } else if (m === "menu") {
        bubbleEl.appendChild(el("p", null, tt("menu")));
        actions.appendChild(button(tt("tour"), "agent-primary", function () { go(0); }));
        actions.appendChild(button(tt("ask"), "", function () {
          hide();
          var box = document.getElementById("ask");
          if (box) { box.scrollIntoView({ behavior: smooth(), block: "center" }); var i = box.querySelector("input"); if (i) setTimeout(function () { i.focus({ preventScroll: true }); }, 300); }
        }));
      } else {
        var s = STEPS[step];
        bubbleEl.appendChild(el("p", "agent-step", fill(tt("step"), { a: step + 1, b: STEPS.length })));
        bubbleEl.appendChild(el("p", null, s[lang()]));
        if (step > 0) actions.appendChild(button(tt("back"), "", function () { go(step - 1); }));
        actions.appendChild(button(step === STEPS.length - 1 ? tt("done") : tt("next"), "agent-primary", function () {
          if (step === STEPS.length - 1) hide(); else go(step + 1);
        }));
        actions.appendChild(button(tt("exit"), "agent-ghost", hide));
      }
      bubbleEl.appendChild(actions);
      var first = actions.querySelector(".agent-primary");
      if (first) first.focus({ preventScroll: true });
    }

    function go(i) {
      step = i;
      unfocus();
      var target = document.querySelector(STEPS[i].target);
      if (target) {
        focused = target;
        target.classList.add("agent-focus");
        target.scrollIntoView({ behavior: smooth(), block: "start" });
      }
      show("tour");
    }
    tour.start = function () { finishIntro(); go(0); };

    launcher.addEventListener("click", function () { if (mode) hide(); else show(store(INTRO_KEY) ? "menu" : "intro"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && mode) { hide(); launcher.focus(); } });
    function applyLang() {
      launcher.setAttribute("aria-label", tt("open"));
      launcher.title = tt("open");
      if (mode === "tour") show("tour"); else if (mode) show(mode);
    }
    applyLang();
    onLangChange(applyLang);

    if (!store(INTRO_KEY)) setTimeout(function () { if (!mode) show("intro"); }, 1200);
    else if (wantMusicHint()) setTimeout(function () { if (!mode && wantMusicHint()) show("music"); }, 1500);
    document.addEventListener("music:clicked", function () { if (mode === "music") hide(); });
  }

  initChat();
  initSkills();
  initAgent();
})();
