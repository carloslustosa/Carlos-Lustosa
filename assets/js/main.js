/* ==========================================================================
   OSC — GESTÃO EMPRESARIAL E LICITAÇÕES
   Interações e animações
   --------------------------------------------------------------------------
   Estratégia:
   • Scroll reveal, acordeões e degraus → IntersectionObserver + CSS
     (funcionam mesmo se o CDN do GSAP falhar).
   • GSAP + ScrollTrigger → parallax das barras do hero e contagem dos números.
   • Tudo respeita prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var HAS_GSAP   = typeof window.gsap !== 'undefined';
  var HAS_ST     = HAS_GSAP && typeof window.ScrollTrigger !== 'undefined';
  var REDUCED    = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (HAS_ST) gsap.registerPlugin(ScrollTrigger);

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ----------------------------------------------------------------------
     01. NAVBAR — fundo sólido ao rolar + link ativo (scrollspy)
     ------------------------------------------------------------------- */
  function initNavbar() {
    var nav = $('#navbar');
    if (!nav) return;

    var onScroll = function () {
      nav.classList.toggle('is-stuck', window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Scrollspy
    var links = $$('.navlink');
    var sections = links
      .map(function (l) { return $(l.getAttribute('href')); })
      .filter(Boolean);

    if (!sections.length || !('IntersectionObserver' in window)) return;

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (l) {
          l.classList.toggle('is-current', l.getAttribute('href') === '#' + e.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ----------------------------------------------------------------------
     02. MENU MOBILE
     ------------------------------------------------------------------- */
  function initMobileMenu() {
    var toggle = $('#menu-toggle');
    var menu   = $('#mobile-menu');
    if (!toggle || !menu) return;

    var open = function () {
      menu.hidden = false;
      // força reflow para a transição de opacidade acontecer
      void menu.offsetWidth;
      menu.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Fechar menu');
      document.body.classList.add('is-locked');
    };

    var close = function () {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menu');
      document.body.classList.remove('is-locked');
      window.setTimeout(function () {
        if (!menu.classList.contains('is-open')) menu.hidden = true;
      }, 320);
    };

    toggle.addEventListener('click', function () {
      menu.classList.contains('is-open') ? close() : open();
    });

    $$('a', menu).forEach(function (a) { a.addEventListener('click', close); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) close();
    });
  }

  /* ----------------------------------------------------------------------
     03. SCROLL REVEAL — elementos surgindo de baixo para cima
     ------------------------------------------------------------------- */
  function initReveal() {
    var items = $$('[data-reveal]');
    if (!items.length) return;

    if (REDUCED || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var delay = parseInt(e.target.getAttribute('data-reveal-delay') || '0', 10);
        window.setTimeout(function () { e.target.classList.add('is-visible'); }, delay);
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------------
     04. CONTADORES DAS ESTATÍSTICAS
     ------------------------------------------------------------------- */
  function initCounters() {
    var stats = $$('.stat[data-count]');
    if (!stats.length) return;

    var render = function (el, value) {
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';
      el.textContent = prefix + Math.round(value).toLocaleString('pt-BR') + suffix;
    };

    if (REDUCED) {
      stats.forEach(function (el) { render(el, parseFloat(el.getAttribute('data-count'))); });
      return;
    }

    var run = function (el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;

      if (HAS_GSAP) {
        var obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 1.8,
          ease: 'power2.out',
          onUpdate: function () { render(el, obj.v); }
        });
        return;
      }

      // Fallback sem GSAP
      var start = null, dur = 1600;
      var tick = function (ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        render(el, target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) {
      stats.forEach(run);
      return;
    }

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        run(e.target);
        obs.unobserve(e.target);
      });
    }, { threshold: 0.5 });

    stats.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------------
     05. METODOLOGIA — degraus interativos + 3 barras subindo em sequência
     ------------------------------------------------------------------- */
  function initMethodology() {
    var list  = $('#steps');
    var chart = $('#chart');
    if (!list) return;

    var steps = $$('.step', list);
    var cols  = chart ? $$('.chart__col', chart) : [];

    var activate = function (index) {
      steps.forEach(function (s, i) {
        var on = i === index;
        s.classList.toggle('is-active', on);
        var btn = $('.step__btn', s);
        if (btn) btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      });
      cols.forEach(function (c, i) { c.classList.toggle('is-focus', i === index); });
    };

    steps.forEach(function (step, i) {
      var btn = $('.step__btn', step);
      if (!btn) return;
      btn.addEventListener('click', function () { activate(i); });
      btn.addEventListener('mouseenter', function () {
        if (window.matchMedia('(hover: hover)').matches) activate(i);
      });
    });

    activate(0);

    // Barras sobem uma a uma quando a seção entra na tela
    if (!chart) return;

    var draw = function () { chart.classList.add('is-drawn'); };

    if (REDUCED) { draw(); return; }

    if (HAS_ST) {
      ScrollTrigger.create({ trigger: chart, start: 'top 82%', once: true, onEnter: draw });
    } else if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          draw();
          obs.unobserve(e.target);
        });
      }, { threshold: 0.25 });
      io.observe(chart);
    } else {
      draw();
    }
  }

  /* ----------------------------------------------------------------------
     06. FAQ — acordeão
     ------------------------------------------------------------------- */
  function initFaq() {
    var faq = $('#faq');
    if (!faq) return;

    $$('.faq__item', faq).forEach(function (item) {
      var q = $('.faq__q', item);
      if (!q) return;

      q.addEventListener('click', function () {
        var isOpen = item.classList.contains('is-open');

        $$('.faq__item', faq).forEach(function (other) {
          other.classList.remove('is-open');
          var ob = $('.faq__q', other);
          if (ob) ob.setAttribute('aria-expanded', 'false');
        });

        if (!isOpen) {
          item.classList.add('is-open');
          q.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  /* ----------------------------------------------------------------------
     07. MARQUEE DE SETORES — loop contínuo
     ------------------------------------------------------------------- */
  function initMarquee() {
    var track = $('#marquee-track');
    if (!track || REDUCED) return;

    // Duplica o conteúdo para o loop de -50% ser imperceptível
    track.innerHTML += track.innerHTML;

    // Velocidade proporcional à largura (mantém ritmo igual em qualquer tela)
    var speed = Math.max(24, Math.round(track.scrollWidth / 90));
    track.style.setProperty('--marquee-speed', speed + 's');
    track.classList.add('is-running');
  }

  /* ----------------------------------------------------------------------
     08. PARALLAX — barras decorativas do hero
     ------------------------------------------------------------------- */
  function initParallax() {
    if (REDUCED || !HAS_ST) return;

    $$('[data-parallax]').forEach(function (el) {
      var amount = parseFloat(el.getAttribute('data-parallax')) || 0.1;
      gsap.to(el, {
        yPercent: amount * 100,
        ease: 'none',
        scrollTrigger: {
          trigger: el.closest('section') || el,
          start: 'top top',
          end: 'bottom top',
          scrub: true
        }
      });
    });
  }

  /* ----------------------------------------------------------------------
     09. FORMULÁRIO — validação simples + envio para o WhatsApp
     ------------------------------------------------------------------- */
  // EDITAR: número da OSC em formato internacional, só dígitos (55 + DDD + número)
  var WHATSAPP_NUMBER = '5500000000000';

  function initForm() {
    var form = $('#lead-form');
    if (!form) return;

    var errorBox = $('#form-error');
    var phone    = $('#f-whats');

    // Máscara leve de telefone
    if (phone) {
      phone.addEventListener('input', function () {
        var d = phone.value.replace(/\D/g, '').slice(0, 11);
        if (d.length > 6) {
          phone.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length > 10 ? 7 : 6) + '-' + d.slice(d.length > 10 ? 7 : 6);
        } else if (d.length > 2) {
          phone.value = '(' + d.slice(0, 2) + ') ' + d.slice(2);
        } else {
          phone.value = d;
        }
      });
    }

    var showError = function (msg) {
      if (!errorBox) return;
      errorBox.textContent = msg;
      errorBox.hidden = false;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var fields  = $$('input[required], select[required], textarea[required]', form);
      var invalid = null;

      fields.forEach(function (f) {
        var ok = f.value.trim() !== '' && (f.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.value.trim()));
        f.classList.toggle('is-invalid', !ok);
        if (!ok && !invalid) invalid = f;
      });

      if (invalid) {
        showError('Confira os campos destacados antes de enviar.');
        invalid.focus();
        return;
      }

      if (errorBox) errorBox.hidden = true;

      var get = function (name) {
        var el = form.elements[name];
        return el ? el.value.trim() : '';
      };

      var lines = [
        'Olá, OSC! Quero falar com um especialista.',
        '',
        'Nome: '     + get('nome'),
        'Empresa: '  + get('empresa'),
        'WhatsApp: ' + get('whatsapp'),
        'E-mail: '   + get('email'),
        'Segmento: ' + get('segmento')
      ];
      if (get('mensagem')) lines.push('Preciso resolver: ' + get('mensagem'));
      var msg = lines.join('\n');

      window.open(
        'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg),
        '_blank',
        'noopener'
      );
    });
  }

  /* ----------------------------------------------------------------------
     10. ANO NO RODAPÉ
     ------------------------------------------------------------------- */
  function initYear() {
    var y = $('#year');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ----------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------- */
  function boot() {
    initNavbar();
    initMobileMenu();
    initReveal();
    initCounters();
    initMethodology();
    initFaq();
    initMarquee();
    initParallax();
    initForm();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
