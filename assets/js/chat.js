// "Ask about me": a small chat where recruiters ask questions about Eder.
// The answers come from the Worker in chat-api/, which holds the API key and the profile.
// The chat stays hidden until data-endpoint on #ask is set to the Worker URL.
(function () {
  var box = document.getElementById("ask");
  if (!box) return;
  var endpoint = (box.getAttribute("data-endpoint") || "").trim();
  if (!endpoint || !window.fetch) return;
  box.hidden = false;

  var root = document.documentElement;
  var log = box.querySelector(".ask-log");
  var form = box.querySelector(".ask-form");
  var input = form.querySelector("input");
  var send = form.querySelector("button");
  var STORE = "ask-history-v1";
  var MAX_SENT = 10; // the Worker keeps the same number of recent messages
  var history = [];
  var busy = false;

  var TEXT = {
    en: {
      placeholder: "e.g. Does Eder know C#?",
      thinking: "Thinking…",
      rate_limited: "Too many questions in a short time. Please wait a minute and try again.",
      refused: "I can't answer that one. Try asking about Eder's skills, experience or projects.",
      error: "Couldn't get an answer right now. Please try again later, or reach Eder on LinkedIn."
    },
    pt: {
      placeholder: "ex.: O Eder sabe C#?",
      thinking: "Pensando…",
      rate_limited: "Muitas perguntas em pouco tempo. Espere um minuto e tente de novo.",
      refused: "Não consigo responder essa. Pergunte sobre as habilidades, a experiência ou os projetos do Eder.",
      error: "Não foi possível responder agora. Tente mais tarde ou fale com o Eder pelo LinkedIn."
    }
  };
  function t(key) { return TEXT[root.lang === "pt-BR" ? "pt" : "en"][key]; }
  function applyLang() { input.placeholder = t("placeholder"); }

  function bubble(cls, text) {
    var div = document.createElement("div");
    div.className = "ask-msg " + cls;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function save() {
    try { sessionStorage.setItem(STORE, JSON.stringify(history.slice(-MAX_SENT))); } catch (e) {}
  }

  try {
    var saved = JSON.parse(sessionStorage.getItem(STORE) || "[]");
    if (Array.isArray(saved)) history = saved;
  } catch (e) {}
  history.forEach(function (m) { bubble(m.role === "user" ? "user" : "bot", m.content); });

  function ask(question) {
    question = question.trim().slice(0, 500);
    if (!question || busy) return;
    busy = true;
    send.disabled = true;
    input.value = "";
    bubble("user", question);
    var pending = bubble("bot typing", t("thinking"));
    var outgoing = history.concat([{ role: "user", content: question }]).slice(-MAX_SENT);
    while (outgoing.length && outgoing[0].role !== "user") outgoing.shift();

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: outgoing })
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) { return { status: res.status, data: data }; });
      })
      .then(function (r) {
        if (r.data && r.data.answer) {
          pending.className = "ask-msg bot";
          pending.textContent = r.data.answer;
          history.push({ role: "user", content: question }, { role: "assistant", content: r.data.answer });
          save();
          return;
        }
        var err = r.data && r.data.error;
        pending.className = "ask-msg bot error";
        pending.textContent = t(r.status === 429 ? "rate_limited" : err === "refused" ? "refused" : "error");
      })
      .catch(function () {
        pending.className = "ask-msg bot error";
        pending.textContent = t("error");
      })
      .then(function () {
        busy = false;
        send.disabled = false;
        log.scrollTop = log.scrollHeight;
      });
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); ask(input.value); });
  box.querySelectorAll(".ask-chip").forEach(function (chip) {
    chip.addEventListener("click", function () { ask(chip.textContent); input.focus(); });
  });

  applyLang();
  new MutationObserver(applyLang).observe(root, { attributes: true, attributeFilter: ["lang"] });
})();
