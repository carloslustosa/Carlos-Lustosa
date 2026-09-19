/* ==========================================================================
   OSC — GESTÃO EMPRESARIAL E LICITAÇÕES
   Interações e animações — Identidade Visual V2.0
   --------------------------------------------------------------------------
   • Scroll reveal, acordeões, etapas e o anel de progresso → IntersectionObserver
     e CSS, escritos à mão. Nenhuma biblioteca externa: a página não busca script
     fora do próprio servidor.
   • WhatsApp: um link só (wa.me), que já abre o app no celular e o Web no PC.
   • Tudo respeita prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';


  var REDUCED  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ----------------------------------------------------------------------
     00. WHATSAPP — link oficial da OSC
     O wa.me decide o destino sozinho: abre o aplicativo no celular e o
     WhatsApp Web no computador. Por isso não existe mais um link por
     dispositivo, e cada página pode ter a sua própria mensagem sem que o
     JavaScript passe por cima dela.
     ------------------------------------------------------------------- */
  var WHATS = {
    phone: '5586994984623',
    link: 'https://wa.me/5586994984623?text=Ol%C3%A1!%20Gostaria%20de%20falar%20com%20um%20especialista%20OSC.'
  };

  /* ----------------------------------------------------------------------
     00b. BANCO DE DADOS — leads do formulário
     Preencha as duas linhas abaixo com os dados do seu projeto Supabase
     (Settings → API). Enquanto estiverem vazias, o formulário continua
     funcionando: ele só não grava, e manda direto para o WhatsApp.

     A chave "anon" é pública de propósito — quem protege os dados é a Row
     Level Security do database/schema.sql, que só permite INSERIR.
     Nunca use aqui a chave "service_role".
     ------------------------------------------------------------------- */
  var DB = {
    url:     '',        // EDITAR: https://xxxxxxxx.supabase.co
    anonKey: '',        // EDITAR: chave anon public
    table:   'leads'
  };

  function dbConfigurado() {
    return Boolean(DB.url && DB.anonKey);
  }

  /* Grava o lead. Não bloqueia o envio: se falhar, o WhatsApp abre do mesmo
     jeito e o contato não se perde. keepalive mantém a requisição viva mesmo
     com a aba trocando para o WhatsApp. */
  function salvarLead(dados) {
    if (!dbConfigurado()) return Promise.resolve({ ok: false, motivo: 'nao-configurado' });

    return fetch(DB.url.replace(/\/$/, '') + '/rest/v1/' + DB.table, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'apikey': DB.anonKey,
        'Authorization': 'Bearer ' + DB.anonKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(dados)
    }).then(function (res) {
      return { ok: res.ok, status: res.status };
    }).catch(function (err) {
      return { ok: false, motivo: String(err) };
    });
  }

  /* Origem do lead: de onde a pessoa veio e por qual campanha */
  function origemDoLead() {
    var q = new URLSearchParams(window.location.search);
    return {
      origem:       'site',
      pagina:        window.location.pathname || '/',
      referrer:      document.referrer ? document.referrer.slice(0, 500) : null,
      utm_source:    q.get('utm_source'),
      utm_medium:    q.get('utm_medium'),
      utm_campaign:  q.get('utm_campaign'),
      user_agent:    (navigator.userAgent || '').slice(0, 300)
    };
  }

  function isMobile() {
    var ua = navigator.userAgent || '';
    if (/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|BlackBerry|webOS/i.test(ua)) return true;
    // iPadOS recente se identifica como Mac: confirma pelo toque
    if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
    return window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 1024;
  }

  // Base para montar links com mensagem própria (ex.: o formulário)
  function whatsBase() {
    return 'https://wa.me/' + WHATS.phone + '?text=';
  }

  function initWhatsappLinks() {
    // Rede de segurança: se alguma página tiver ficado com um link antigo
    // (api./web.whatsapp.com, ou o número anterior), ele é corrigido aqui,
    // preservando a mensagem daquela página.
    $$('.js-whats').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href.indexOf('wa.me/' + WHATS.phone) !== -1) return;
      var texto = (href.match(/[?&]text=([^&]*)/) || [])[1];
      a.setAttribute('href', texto ? whatsBase() + texto : WHATS.link);
    });
  }

  /* ----------------------------------------------------------------------
     01. NAVBAR — fundo sólido ao rolar + link ativo
     ------------------------------------------------------------------- */
  function initNavbar() {
    var nav = $('#navbar');
    if (!nav) return;

    var onScroll = function () { nav.classList.toggle('is-stuck', window.scrollY > 24); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var links = $$('.navlink');
    var sections = links.map(function (l) { return $(l.getAttribute('href')); }).filter(Boolean);
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
     01b. ÍNDICE DO GUIA — acompanha a rolagem
     Só faz algo na página do guia, onde existem links .toclink.
     ------------------------------------------------------------------- */
  function initToc() {
    var links = $$('.toclink');
    if (!links.length || !('IntersectionObserver' in window)) return;

    var alvos = links
      .map(function (l) { return $(l.getAttribute('href')); })
      .filter(Boolean);
    if (!alvos.length) return;

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (l) {
          l.classList.toggle('is-current', l.getAttribute('href') === '#' + e.target.id);
        });
      });
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

    alvos.forEach(function (a) { spy.observe(a); });
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
      void menu.offsetWidth;                 // força reflow para a transição rodar
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
     03. SCROLL REVEAL
     ------------------------------------------------------------------- */
  function initReveal() {
    var items = $$('[data-reveal]');
    if (!items.length) return;

    if (REDUCED || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var mostrar = function (el, atraso) {
      if (el.classList.contains('is-visible')) return;
      if (atraso) window.setTimeout(function () { el.classList.add('is-visible'); }, atraso);
      else el.classList.add('is-visible');
    };

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        mostrar(e.target, parseInt(e.target.getAttribute('data-reveal-delay') || '0', 10));
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });

    items.forEach(function (el) { io.observe(el); });

    /* Rede de segurança.
       O observador sozinho pode deixar passar um bloco quando a rolagem salta:
       clique numa âncora, dedo com força, botão de "ir para o fim". O usuário
       então encontra uma faixa de cor vazia, sem texto nenhum.
       Esta varredura roda na rolagem e garante que nada fique escondido depois
       de já ter passado pela tela. É barata: só mede o que ainda falta. */
    var restantes = items.slice();

    function varrer() {
      if (!restantes.length) return;
      var limite = window.innerHeight * 0.95;
      var ainda = [];
      for (var i = 0; i < restantes.length; i++) {
        var el = restantes[i];
        if (el.classList.contains('is-visible')) continue;
        if (el.getBoundingClientRect().top < limite) mostrar(el, 0);
        else ainda.push(el);
      }
      restantes = ainda;
    }

    var agendado = false;
    var aoRolar = function () {
      if (agendado) return;
      agendado = true;
      window.requestAnimationFrame(function () { agendado = false; varrer(); });
    };

    window.addEventListener('scroll', aoRolar, { passive: true });
    window.addEventListener('resize', aoRolar);
    window.addEventListener('load', varrer);
    window.setTimeout(varrer, 400);
  }

  /* ----------------------------------------------------------------------
     04. METODOLOGIA — etapas + anel de progresso
     O anel da marca fecha um terço a cada etapa.
     ------------------------------------------------------------------- */
  function initMethodology() {
    var list = $('#steps');
    if (!list) return;

    var steps = $$('.step', list);
    var fill  = $('#gauge-fill');
    var pips  = $$('.gauge__pip');
    var elStep = $('#gauge-step');
    var elName = $('#gauge-name');
    var elPct  = $('#gauge-pct');

    var CIRC = 289.03;               // 2 · π · 46
    var armed = REDUCED;             // o anel só desenha depois de entrar na tela
    var current = 0;

    var paint = function () {
      if (!fill) return;
      var pct = armed ? (parseInt(steps[current].getAttribute('data-pct'), 10) || 0) : 0;
      fill.style.strokeDashoffset = String(CIRC * (1 - pct / 100));
      if (elPct) elPct.textContent = pct + '%';
      pips.forEach(function (p, i) { p.classList.toggle('is-on', armed && i <= current); });
    };

    var activate = function (index) {
      current = index;
      steps.forEach(function (s, i) {
        var on = i === index;
        s.classList.toggle('is-active', on);
        var btn = $('.step__btn', s);
        if (btn) btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      });

      var step = steps[index];
      if (elStep) elStep.textContent = 'Etapa 0' + (index + 1);
      if (elName) elName.textContent = step.getAttribute('data-name') || '';
      paint();
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

    var gauge = $('#gauge');
    if (!gauge || armed) { armed = true; paint(); return; }

    var arm = function () { armed = true; paint(); };

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          arm();
          obs.unobserve(e.target);
        });
      }, { threshold: 0.3 });
      io.observe(gauge);
    } else {
      arm();
    }
  }

  /* ----------------------------------------------------------------------
     05. FAQ — acordeão
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
     06. MARQUEE DE SETORES
     ------------------------------------------------------------------- */
  function initMarquee() {
    var track = $('#marquee-track');
    if (!track || REDUCED) return;

    track.innerHTML += track.innerHTML;     // duplica para o loop ser contínuo

    var speed = Math.max(24, Math.round(track.scrollWidth / 90));
    track.style.setProperty('--marquee-speed', speed + 's');
    track.classList.add('is-running');
  }

  /* ----------------------------------------------------------------------
     08. FORMULÁRIO — validação + envio para o WhatsApp
     ------------------------------------------------------------------- */
  function initForm() {
    var form = $('#lead-form');
    if (!form) return;

    var errorBox = $('#form-error');
    var okBox    = $('#form-ok');
    var phone    = $('#f-whats');
    var submit   = form.querySelector('button[type="submit"]');
    var enviando = false;

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

    var aviso = function (box, texto) {
      if (!box) return;
      box.textContent = texto;
      box.hidden = !texto;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (enviando) return;

      var get = function (name) {
        var el = form.elements[name];
        return el ? el.value.trim() : '';
      };

      // Armadilha anti-robô: campo escondido que só um bot preenche.
      // Fingimos sucesso para não avisar o robô de que foi barrado.
      if (get('website')) { aviso(okBox, 'Recebemos sua mensagem. Já retornamos.'); form.reset(); return; }

      var fields  = $$('input[required], select[required], textarea[required]', form);
      var invalid = null;

      fields.forEach(function (f) {
        var ok = f.value.trim() !== '' &&
                 (f.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.value.trim()));
        f.classList.toggle('is-invalid', !ok);
        if (!ok && !invalid) invalid = f;
      });

      if (invalid) {
        aviso(okBox, '');
        aviso(errorBox, 'Confira os campos destacados antes de enviar.');
        invalid.focus();
        return;
      }

      aviso(errorBox, '');

      var lead = {
        nome:     get('nome'),
        empresa:  get('empresa'),
        whatsapp: get('whatsapp'),
        email:    get('email'),
        segmento: get('segmento') || null,
        mensagem: get('mensagem') || null
      };

      var origem = origemDoLead();
      for (var k in origem) { if (origem[k]) lead[k] = origem[k]; }

      var mensagem = [
        'Oi! Quero mais informações sobre a OSC.',
        '',
        'Nome: '     + lead.nome,
        'Empresa: '  + lead.empresa,
        'WhatsApp: ' + lead.whatsapp,
        'E-mail: '   + lead.email,
        'Segmento: ' + (lead.segmento || '—')
      ];
      if (lead.mensagem) mensagem.push('Preciso resolver: ' + lead.mensagem);

      // Grava no banco (sem esperar) e abre o WhatsApp no mesmo gesto do
      // clique — se abrisse depois do await, o bloqueador de pop-up barraria.
      enviando = true;
      if (submit) submit.disabled = true;

      var gravando = salvarLead(lead);

      window.open(whatsBase() + encodeURIComponent(mensagem.join('\n')), '_blank', 'noopener');

      gravando.then(function (res) {
        enviando = false;
        if (submit) submit.disabled = false;

        if (res.ok) {
          aviso(okBox, 'Recebemos seus dados. Abrimos o WhatsApp para você continuar a conversa.');
          form.reset();
        } else if (res.motivo === 'nao-configurado') {
          // Sem banco ligado, o WhatsApp já levou o contato adiante.
          aviso(okBox, 'Abrimos o WhatsApp com a sua mensagem pronta. É só enviar.');
          form.reset();
        } else {
          aviso(okBox, 'Abrimos o WhatsApp com a sua mensagem pronta. É só enviar.');
        }
      });
    });
  }

  /* ----------------------------------------------------------------------
     08b. ALERTA DE EDITAIS
     Cadastro leve: e-mail, segmento e estado. Entra no mesmo banco de leads,
     com origem própria, para o time saber de onde veio.
     ------------------------------------------------------------------- */
  function initAlerta() {
    var form = $('#alerta-form');
    if (!form) return;

    var okBox  = $('#alerta-ok');
    var errBox = $('#alerta-erro');
    var botao  = form.querySelector('button[type="submit"]');
    var enviando = false;

    var mostra = function (box, texto) {
      if (!box) return;
      box.textContent = texto || '';
      box.hidden = !texto;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (enviando) return;

      var pega = function (n) {
        var el = form.elements[n];
        return el ? el.value.trim() : '';
      };

      // armadilha anti-robô: finge que deu certo, para não avisar o robô
      if (pega('website')) { mostra(okBox, 'Pronto! Você vai receber os avisos.'); form.reset(); return; }

      var falho = null;
      $$('input[required], select[required]', form).forEach(function (f) {
        var ok = f.value.trim() !== '' &&
                 (f.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.value.trim()));
        f.classList.toggle('is-invalid', !ok);
        if (!ok && !falho) falho = f;
      });
      if (falho) {
        mostra(okBox, '');
        mostra(errBox, 'Confira os campos destacados.');
        falho.focus();
        return;
      }
      mostra(errBox, '');

      var lead = {
        nome:     'Alerta de editais',
        empresa:  pega('empresa') || 'não informada',
        whatsapp: '—',
        email:    pega('email'),
        segmento: pega('segmento') || null,
        mensagem: 'Assinou o alerta de editais. Estado: ' + (pega('estado') || '—')
      };
      var origem = origemDoLead();
      for (var k in origem) { if (origem[k]) lead[k] = origem[k]; }
      lead.origem = 'alerta-editais';

      enviando = true;
      if (botao) botao.disabled = true;
      mostra(okBox, 'Enviando…');

      salvarLead(lead).then(function (res) {
        enviando = false;
        if (botao) botao.disabled = false;

        if (res.ok) {
          mostra(okBox, 'Pronto! Avisamos você quando aparecer edital do seu segmento.');
          form.reset();
        } else if (res.motivo === 'nao-configurado') {
          // sem banco ligado, manda pelo WhatsApp para não perder o contato
          var texto = 'Oi! Quero receber o alerta de editais.\n\n' +
                      'E-mail: ' + lead.email + '\n' +
                      'Segmento: ' + (lead.segmento || '—') + '\n' +
                      'Estado: ' + (pega('estado') || '—');
          window.open(whatsBase() + encodeURIComponent(texto), '_blank', 'noopener');
          mostra(okBox, 'Abrimos o WhatsApp com seu pedido pronto. É só enviar.');
          form.reset();
        } else {
          mostra(okBox, '');
          mostra(errBox, 'Não conseguimos registrar agora. Tente de novo em alguns minutos.');
        }
      });
    });
  }

  /* ----------------------------------------------------------------------
     09. ANO NO RODAPÉ
     ------------------------------------------------------------------- */
  function initYear() {
    var y = $('#year');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ----------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------- */
  function boot() {
    initWhatsappLinks();
    initNavbar();
    initToc();
    initMobileMenu();
    initReveal();
    initMethodology();
    initFaq();
    initMarquee();
    initForm();
    initAlerta();
    initYear();
  }

  /* Compartilha o que o relatório com IA também precisa, em vez de duplicar
     a gravação de lead e a montagem do link do WhatsApp. */
  window.OSC = {
    salvarLead: salvarLead,
    origemDoLead: origemDoLead,
    whatsBase: whatsBase,
    dbConfigurado: dbConfigurado
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
