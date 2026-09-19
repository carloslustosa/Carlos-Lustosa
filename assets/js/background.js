/* ==========================================================================
   OSC — Fundo interativo
   --------------------------------------------------------------------------
   Um campo de monogramas da marca desenhado em <canvas>, atrás do conteúdo.
   O fundo em si é cor sólida (#12301F); o canvas só acrescenta os anéis.

   Interação:
   • O monograma mais próximo do cursor/dedo acende, gira e se afasta de leve.
   • Clique ou toque dispara uma onda que empurra os anéis.
   • No celular, o giroscópio (quando autorizado) inclina o campo.

   Desempenho: DPR limitado a 2, quantidade proporcional à área da tela,
   pausa com a aba oculta e desliga em prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('bg-canvas');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Paleta oficial — o fundo interativo não inventa cor nenhuma */
  var COLOR = { o: '242, 239, 228', c: '63, 138, 75', dot: '135, 208, 106' };

  var W = 0, H = 0, dpr = 1;
  var rings = [];
  var waves = [];
  var pointer = { x: -9999, y: -9999, active: false };
  var tilt = { x: 0, y: 0 };
  var raf = null;

  /* ----------------------------------------------------------------------
     Geometria do monograma, parametrizada pelo raio do anel O.
     Proporções idênticas às do SVG do logo:
     anel O  → espessura = diâmetro / 6
     anel C  → 8 % menor, abertura de 70° no quadrante superior direito,
               centro deslocado na diagonal ascendente (+0.5r, -0.5r)
     ponto   → no cruzamento real dos dois anéis
     ------------------------------------------------------------------- */
  /* Todas as proporções abaixo saíram da medição da arte original do logo,
     normalizadas pelo raio médio do anel O. */
  var RAD      = Math.PI / 180;
  var O_TRACO  = 0.3547;                   // espessura do anel O
  var C_DESLOC = { x: 1.0778, y: 0.6341 }; // centro do C, a partir do centro do O
  var C_RAIO   = 0.8928;                   // raio do C
  var C_TRACO  = 0.3532;                   // espessura do C
  var C_INICIO = 353 * RAD;                // onde o traço do C começa
  var C_ARCO   = 283 * RAD;                // quanto ele percorre, no sentido horário
  var P_DESLOC = { x: 1.2682, y: -0.0977 };// centro do ponto
  var P_RAIO   = 0.2501;                   // raio do ponto

  function drawMonogram(x, y, r, rot, alpha, glow) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    // anel O — fechado
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.lineWidth = r * O_TRACO;
    ctx.strokeStyle = 'rgba(' + COLOR.o + ',' + (alpha * (0.5 + glow * 0.5)).toFixed(3) + ')';
    ctx.stroke();

    // anel C — aberto no quadrante superior direito, deslocado na diagonal
    ctx.beginPath();
    ctx.arc(r * C_DESLOC.x, r * C_DESLOC.y, r * C_RAIO, C_INICIO, C_INICIO + C_ARCO);
    ctx.lineWidth = r * C_TRACO;
    ctx.strokeStyle = 'rgba(' + COLOR.c + ',' + (alpha * (1 + glow)).toFixed(3) + ')';
    ctx.stroke();

    // ponto de encontro
    ctx.beginPath();
    ctx.arc(r * P_DESLOC.x, r * P_DESLOC.y, r * P_RAIO, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(' + COLOR.dot + ',' + (alpha * (1.3 + glow * 1.6)).toFixed(3) + ')';
    ctx.fill();

    ctx.restore();
  }

  /* ----------------------------------------------------------------------
     Campo de anéis
     ------------------------------------------------------------------- */
  function ringCount() {
    /* Menos anéis do que antes: o fundo é textura, não desenho. Cheio demais,
       ele briga com o texto em vez de sustentar. */
    var area = W * H;
    return Math.max(3, Math.min(9, Math.round(area / 260000)));
  }

  function build() {
    rings = [];
    var n = ringCount();

    for (var i = 0; i < n; i++) {
      var big = i === 0;                     // um monograma grande ancora o campo
      var r = big
        ? Math.min(W, H) * (W < 700 ? 0.3 : 0.26)
        : Math.min(W, H) * (0.035 + Math.random() * 0.075);

      rings.push({
        hx: Math.random() * W,               // posição de repouso
        hy: Math.random() * H,
        x: 0, y: 0,                          // deslocamento atual
        vx: 0, vy: 0,
        r: r,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.0016,
        drift: 0.1 + Math.random() * 0.35,   // amplitude do vaivém lento
        phase: Math.random() * Math.PI * 2,
        speed: 0.00012 + Math.random() * 0.00022,
        alpha: big ? 0.07 : 0.07 + Math.random() * 0.07,
        glow: 0
      });
    }

    // o monograma grande fica na borda direita, como no material impresso
    if (rings[0]) { rings[0].hx = W * 0.86; rings[0].hy = H * 0.72; }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
    if (REDUCED) frame(0);                   // desenha uma vez, sem animar
  }

  /* ----------------------------------------------------------------------
     Loop
     ------------------------------------------------------------------- */
  function frame(t) {
    ctx.clearRect(0, 0, W, H);

    // ondas disparadas por clique/toque
    for (var w = waves.length - 1; w >= 0; w--) {
      waves[w].r += waves[w].v;
      waves[w].life -= 0.014;
      if (waves[w].life <= 0) waves.splice(w, 1);
    }

    for (var i = 0; i < rings.length; i++) {
      var ring = rings[i];

      // vaivém lento de repouso
      var wander = Math.sin(t * ring.speed + ring.phase) * ring.drift * 40;
      var baseX = ring.hx + wander + tilt.x * (ring.r * 0.4);
      var baseY = ring.hy + Math.cos(t * ring.speed * 0.8 + ring.phase) * ring.drift * 30 + tilt.y * (ring.r * 0.4);

      // repulsão suave do cursor
      var target = 0;
      if (pointer.active) {
        var dx = baseX + ring.x - pointer.x;
        var dy = baseY + ring.y - pointer.y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var reach = Math.max(180, ring.r * 2.4);
        if (dist < reach) {
          var push = (1 - dist / reach);
          ring.vx += (dx / dist) * push * 0.5;
          ring.vy += (dy / dist) * push * 0.5;
          target = push;                     // acende conforme a proximidade
        }
      }

      // ondas empurram o anel para fora
      for (var k = 0; k < waves.length; k++) {
        var wv = waves[k];
        var wdx = baseX + ring.x - wv.x;
        var wdy = baseY + ring.y - wv.y;
        var wd = Math.sqrt(wdx * wdx + wdy * wdy) || 1;
        if (Math.abs(wd - wv.r) < 90) {
          var force = (1 - Math.abs(wd - wv.r) / 90) * wv.life;
          ring.vx += (wdx / wd) * force * 2.2;
          ring.vy += (wdy / wd) * force * 2.2;
          if (force > target) target = force;
        }
      }

      ring.glow += (target - ring.glow) * 0.08;

      // mola de volta ao repouso + atrito
      ring.vx += -ring.x * 0.012;
      ring.vy += -ring.y * 0.012;
      ring.vx *= 0.9;
      ring.vy *= 0.9;
      ring.x += ring.vx;
      ring.y += ring.vy;

      ring.rot += ring.spin + ring.glow * 0.012;

      drawMonogram(baseX + ring.x, baseY + ring.y, ring.r, ring.rot, ring.alpha, ring.glow);
    }

    // Em prefers-reduced-motion o desenho acontece uma vez só, sem reagendar.
    if (!REDUCED) raf = window.requestAnimationFrame(frame);
  }

  /* ----------------------------------------------------------------------
     Eventos
     ------------------------------------------------------------------- */
  function setPointer(x, y) {
    if (REDUCED) return;
    var rect = canvas.getBoundingClientRect();
    pointer.x = x - rect.left;
    pointer.y = y - rect.top;
    pointer.active = true;
  }

  function addWave(x, y) {
    if (REDUCED) return;
    var rect = canvas.getBoundingClientRect();
    waves.push({ x: x - rect.left, y: y - rect.top, r: 0, v: 13, life: 1 });
    if (waves.length > 4) waves.shift();
  }

  function start() {
    if (REDUCED || raf !== null) return;
    raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    if (raf === null) return;
    window.cancelAnimationFrame(raf);
    raf = null;
  }

  window.addEventListener('resize', function () {
    window.clearTimeout(resize._t);
    resize._t = window.setTimeout(resize, 150);
  });

  window.addEventListener('mousemove', function (e) { setPointer(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener('mouseleave', function () { pointer.active = false; });
  window.addEventListener('pointerdown', function (e) { addWave(e.clientX, e.clientY); }, { passive: true });

  window.addEventListener('touchmove', function (e) {
    if (e.touches.length) setPointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('touchend', function () {
    window.setTimeout(function () { pointer.active = false; }, 600);
  }, { passive: true });

  // Inclinação do aparelho — só onde o navegador entrega sem pedir permissão
  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma === null) return;
      tilt.x = Math.max(-1, Math.min(1, e.gamma / 45));
      tilt.y = Math.max(-1, Math.min(1, ((e.beta || 0) - 45) / 45));
    }, { passive: true });
  }

  document.addEventListener('visibilitychange', function () {
    document.hidden ? stop() : start();
  });

  resize();
  start();
})();
