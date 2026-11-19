// Ambient effects, drawn on a low-resolution canvas scaled up with hard pixels
// (a light 16-bit / SNES look) and a faint scanline layer:
// - light theme: cherry blossom petals; now and then a gust of petals or a paper crane;
// - dark theme: rain, drops that land and slide on the "glass"; now and then a
//   shooting star or a floating paper lantern.
// Everything sits under pointer-events: none, stays faint so text reads normally,
// pauses in background tabs, and is off by default for people who prefer reduced
// motion. The sparkle button in the top bar turns it on and off (remembered).
(function () {
  var root = document.documentElement;
  var KEY = "fx";
  var PX = 3; // size of one "pixel" on screen
  var reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var canvas = document.createElement("canvas");
  if (!canvas.getContext) return;
  var ctx = canvas.getContext("2d");

  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  var on = saved() ? saved() === "on" : !reduce.matches;

  canvas.className = "fx-canvas";
  canvas.setAttribute("aria-hidden", "true");
  var scan = document.createElement("div");
  scan.className = "fx-snes";
  scan.setAttribute("aria-hidden", "true");

  // ---- toggle button ----
  var nav = document.querySelector(".nav");
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "icon-btn fx-toggle";
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>';
  function label() {
    var pt = root.lang === "pt-BR";
    var l = on ? (pt ? "Desligar efeitos (pétalas, chuva)" : "Turn off effects (petals, rain)")
               : (pt ? "Ligar efeitos (pétalas, chuva)" : "Turn on effects (petals, rain)");
    btn.setAttribute("aria-label", l); btn.title = l;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  if (nav) nav.insertBefore(btn, nav.querySelector(".lang-toggle"));
  btn.addEventListener("click", function () {
    on = !on;
    try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {}
    apply();
  });
  new MutationObserver(label).observe(root, { attributes: true, attributeFilter: ["lang"] });

  // ---- scene ----
  var W = 0, H = 0, petals = [], rain = [], drops = [], extras = [];
  var nextEvent = 0, nextDrop = 0, last = 0, raf = 0, t = 0;
  function dark() { return root.dataset.theme === "dark"; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function resize() {
    W = Math.ceil(window.innerWidth / PX);
    H = Math.ceil(window.innerHeight / PX);
    canvas.width = W; canvas.height = H;
    populate();
  }
  var PETAL = ["#f7c6d4", "#f2b2c5", "#fbdde6", "#eaa0b8"];
  function petal(y) {
    return { x: rnd(0, W), y: y === undefined ? rnd(-H, 0) : y, vy: rnd(4, 9), vx: rnd(-1, 2), sway: rnd(4, 10),
      ph: rnd(0, 6.3), rot: rnd(0, 6.3), vr: rnd(-1.5, 1.5), s: rnd(1.4, 2.4), c: pick(PETAL), a: rnd(.55, .85) };
  }
  function streak() { return { x: rnd(-20, W + 20), y: rnd(-H, H), v: rnd(150, 230), l: rnd(4, 8) }; }
  function populate() {
    var n = Math.max(8, Math.min(24, Math.round(window.innerWidth / 70)));
    petals = []; for (var i = 0; i < n; i++) petals.push(petal(rnd(0, H)));
    var r = Math.max(30, Math.min(110, Math.round(window.innerWidth / 14)));
    rain = []; for (var j = 0; j < r; j++) rain.push(streak());
  }

  // occasional events
  function scheduleEvent(now) { nextEvent = now + rnd(22, 40); }
  function startEvent() {
    if (dark()) {
      if (Math.random() < .5) extras.push({ k: "star", x: rnd(W * .35, W * .9), y: rnd(4, H * .25), life: 0, dur: 1.4 });
      else extras.push({ k: "lantern", x: rnd(W * .1, W * .9), y: H + 8, life: 0, dur: 16, ph: rnd(0, 6) });
    } else {
      if (Math.random() < .5) {
        for (var i = 0; i < 26; i++) { var p = petal(rnd(-20, H * .6)); p.x = rnd(-60, -5); p.gust = 1; p.vx = rnd(22, 40); p.vy = rnd(3, 8); extras.push({ k: "petal", p: p }); }
      } else extras.push({ k: "crane", x: -20, y: rnd(10, H * .3), life: 0, dur: 14 });
    }
  }

  function drawPetal(p) {
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.a;
    ctx.fillStyle = p.c;
    ctx.beginPath(); ctx.ellipse(0, 0, p.s * 1.4, p.s * .8, 0, 0, 6.283); ctx.fill();
    ctx.restore();
  }
  function stepPetal(p, dt) {
    p.ph += dt * 1.3; p.rot += p.vr * dt;
    p.x += (p.vx + Math.sin(p.ph) * p.sway * .5) * dt;
    p.y += p.vy * dt;
  }
  function drawCrane(e) {
    var x = Math.round(e.x), y = Math.round(e.y + Math.sin(e.life * 2) * 3);
    var flap = Math.sin(e.life * 8) > 0;
    ctx.globalAlpha = .9;
    ctx.fillStyle = "#e4574f";
    ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y - 1); ctx.lineTo(x + 2, y + 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 5, y - 1); ctx.lineTo(x + 9, y - 4); ctx.lineTo(x + 7, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#c8443d";
    ctx.beginPath();
    if (flap) { ctx.moveTo(x - 2, y); ctx.lineTo(x + 3, y - 8); ctx.lineTo(x + 3, y); }
    else { ctx.moveTo(x - 2, y); ctx.lineTo(x + 4, y + 6); ctx.lineTo(x + 3, y); }
    ctx.closePath(); ctx.fill();
  }
  function drawLantern(e) {
    var x = Math.round(e.x + Math.sin(e.life * .8 + e.ph) * 4), y = Math.round(e.y);
    var a = Math.min(1, e.life / 2, (e.dur - e.life) / 2);
    var g = ctx.createRadialGradient(x, y, 0, x, y, 14);
    g.addColorStop(0, "rgba(255,190,110,.35)"); g.addColorStop(1, "rgba(255,190,110,0)");
    ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(x - 14, y - 14, 28, 28);
    ctx.fillStyle = "#f0a35c"; ctx.fillRect(x - 3, y - 4, 6, 8);
    ctx.fillStyle = "#ffd8a0"; ctx.fillRect(x - 2, y - 3, 4, 6);
    ctx.fillStyle = "#7a4a2a"; ctx.fillRect(x - 3, y - 5, 6, 1); ctx.fillRect(x - 3, y + 4, 6, 1);
  }
  function drawStar(e) {
    var k = e.life / e.dur, x = e.x - k * 60, y = e.y + k * 22;
    ctx.globalAlpha = Math.sin(k * Math.PI) * .9;
    ctx.strokeStyle = "#e9f1ff"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Math.round(x), Math.round(y)); ctx.lineTo(Math.round(x + 18), Math.round(y - 7)); ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
  }
  function drawDrop(d) {
    var a = Math.min(1, d.life / .4, (d.dur - d.life) / 1.5) * .55;
    if (a <= 0) return;
    var x = Math.round(d.x), y = Math.round(d.y), r = d.r;
    ctx.globalAlpha = a;
    var g = ctx.createRadialGradient(x - r * .3, y - r * .3, r * .2, x, y, r);
    g.addColorStop(0, "rgba(220,235,255,.05)");
    g.addColorStop(.75, "rgba(200,220,255,.18)");
    g.addColorStop(1, "rgba(235,245,255,.55)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, r * .85, r, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fillRect(x - Math.round(r * .35), y - Math.round(r * .45), 1, 1);
    if (d.trail > 2) { ctx.fillStyle = "rgba(210,225,255,.25)"; ctx.fillRect(x, y - d.trail - r, 1, d.trail); }
  }

  function frame(now) {
    raf = 0;
    if (!on || document.hidden) return;
    now /= 1000;
    var dt = Math.min(.05, last ? now - last : 0); last = now; t += dt;
    if (!nextEvent) scheduleEvent(t);
    if (t > nextEvent) { startEvent(); scheduleEvent(t); }
    ctx.clearRect(0, 0, W, H);
    var night = dark();
    if (night) {
      ctx.globalAlpha = .28; ctx.strokeStyle = "#b9cdf2"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (var i = 0; i < rain.length; i++) {
        var s = rain[i];
        s.y += s.v * dt; s.x -= s.v * .18 * dt;
        if (s.y > H + 10) { s.y = rnd(-40, -5); s.x = rnd(0, W + 30); }
        ctx.moveTo(Math.round(s.x), Math.round(s.y)); ctx.lineTo(Math.round(s.x + s.l * .18), Math.round(s.y - s.l));
      }
      ctx.stroke();
      if (t > nextDrop) {
        if (drops.length < 10) drops.push({ x: rnd(4, W - 4), y: rnd(4, H * .85), r: rnd(2.2, 4.5), vy: 0, life: 0, dur: rnd(6, 11), trail: 0 });
        nextDrop = t + rnd(.9, 2.2);
      }
      for (var d = drops.length - 1; d >= 0; d--) {
        var dr = drops[d];
        dr.life += dt;
        if (Math.random() < dt * .5) dr.vy = rnd(4, 18); // a drop lets go and slides
        dr.vy *= (1 - dt * .9); dr.y += dr.vy * dt; dr.trail = Math.min(dr.trail + dr.vy * dt, 14);
        if (dr.life > dr.dur || dr.y > H + 10) drops.splice(d, 1); else drawDrop(dr);
      }
    } else {
      drops.length = 0;
      for (var p = 0; p < petals.length; p++) {
        var pe = petals[p]; stepPetal(pe, dt);
        if (pe.y > H + 6 || pe.x > W + 10) { petals[p] = petal(rnd(-12, -4)); continue; }
        drawPetal(pe);
      }
    }
    for (var e = extras.length - 1; e >= 0; e--) {
      var ex = extras[e], gone = false;
      if (ex.k === "petal") {
        if (night) gone = true;
        else { stepPetal(ex.p, dt); drawPetal(ex.p); gone = ex.p.y > H + 6 || ex.p.x > W + 10; }
      } else {
        ex.life += dt; gone = ex.life > ex.dur;
        if (ex.k === "crane" && !night) { ex.x += (W + 40) / ex.dur * dt; drawCrane(ex); }
        else if (ex.k === "lantern" && night) { ex.y -= (H + 30) / ex.dur * dt; drawLantern(ex); }
        else if (ex.k === "star" && night) drawStar(ex);
        else gone = true;
      }
      if (gone) extras.splice(e, 1);
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf && on && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }

  function apply() {
    label();
    root.classList.toggle("fx-on", on);
    if (on) {
      if (!canvas.parentNode) { document.body.appendChild(canvas); document.body.appendChild(scan); resize(); }
      start();
    } else {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (canvas.parentNode) { canvas.remove(); scan.remove(); }
      extras.length = 0; drops.length = 0;
    }
  }
  window.addEventListener("resize", function () { if (on) resize(); });
  document.addEventListener("visibilitychange", start);
  apply();
})();
