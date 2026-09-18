/* ==========================================================================
   OSC — Comportamento dos componentes
   Avatar, carrossel e upload de arquivo. Sem dependências.
   Expõe window.OSCComp para as outras telas usarem.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ----------------------------------------------------------------------
     AVATAR
     Monta as iniciais a partir do nome e troca pela foto quando ela carrega.
     Se a foto falhar, as iniciais continuam lá — o usuário nunca vê um
     quadrado quebrado.
     ------------------------------------------------------------------- */

  /* Primeira e última palavra do nome, no máximo duas letras. */
  function iniciais(nome) {
    var partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  /* Tom do avatar derivado do nome: a mesma pessoa tem sempre a mesma cor,
     e todas saem da paleta da marca. */
  var TONS = [
    { fundo: 'rgba(63, 138, 75, 0.9)',   texto: '#F2EFE4' },
    { fundo: 'rgba(135, 208, 106, 0.9)', texto: '#12301F' },
    { fundo: 'rgba(18, 48, 31, 0.9)',    texto: '#87D06A' },
    { fundo: 'rgba(47, 106, 58, 0.9)',   texto: '#F2EFE4' },
    { fundo: 'rgba(242, 239, 228, 0.9)', texto: '#12301F' }
  ];
  function tomDoNome(nome) {
    var soma = 0;
    var t = String(nome || '');
    for (var i = 0; i < t.length; i++) soma = (soma + t.charCodeAt(i)) % 9973;
    return TONS[soma % TONS.length];
  }

  var ICONE_PESSOA =
    '<svg class="avt__icone" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"/></svg>';

  function montarAvatar(el) {
    if (!el || el.dataset.montado === '1') return el;
    el.dataset.montado = '1';

    var nome = el.getAttribute('data-nome') || '';
    var foto = el.getAttribute('data-foto') || '';
    var letras = iniciais(nome);

    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', nome || 'Usuário');

    el.innerHTML = letras
      ? '<span class="avt__ini">' + letras.replace(/[<>&]/g, '') + '</span>'
      : ICONE_PESSOA;

    // cor automática só quando não foi escolhida uma variante
    if (!el.className.match(/avt--(solido|suave|contorno)/)) {
      var tom = tomDoNome(nome);
      el.style.background = tom.fundo;
      el.style.color = tom.texto;
    }

    if (foto) {
      var img = new Image();
      img.className = 'avt__img';
      img.alt = '';
      img.decoding = 'async';
      img.onload = function () { img.classList.add('is-carregada'); };
      img.onerror = function () { if (img.parentNode) img.parentNode.removeChild(img); };
      img.src = foto;
      el.appendChild(img);
    }
    return el;
  }

  /* Troca nome/foto de um avatar já montado */
  function atualizarAvatar(el, nome, foto) {
    if (!el) return;
    el.dataset.montado = '';
    if (nome != null) el.setAttribute('data-nome', nome);
    if (foto != null) el.setAttribute('data-foto', foto);
    el.style.background = '';
    el.style.color = '';
    montarAvatar(el);
  }

  function iniciarAvatares(raiz) { $$('.avt[data-nome], .avt[data-foto]', raiz).forEach(montarAvatar); }

  /* ----------------------------------------------------------------------
     CARROSSEL
     A rolagem com encaixe já funciona sozinha no dedo. O JS acrescenta
     setas, marcadores, contador e navegação pelo teclado.
     ------------------------------------------------------------------- */
  function iniciarCarrossel(raiz) {
    var trilho = $('.carrossel__trilho', raiz);
    if (!trilho) return;

    var itens   = $$('.carrossel__item', trilho);
    var anterior = $('[data-carr="anterior"]', raiz);
    var proximo  = $('[data-carr="proximo"]', raiz);
    var pontos   = $('.carrossel__pontos', raiz);
    var contador = $('.carrossel__contador', raiz);
    if (!itens.length) return;

    /* Quantos itens cabem por vez — muda com a largura da tela */
    function porPagina() {
      var larg = itens[0].getBoundingClientRect().width +
                 parseFloat(getComputedStyle(trilho).gap || 0);
      return Math.max(1, Math.round(trilho.clientWidth / larg));
    }
    function paginas() { return Math.max(1, Math.ceil(itens.length / porPagina())); }
    function paginaAtual() {
      var larg = itens[0].getBoundingClientRect().width +
                 parseFloat(getComputedStyle(trilho).gap || 0);
      return Math.min(paginas() - 1, Math.round(trilho.scrollLeft / (larg * porPagina())));
    }

    function irPara(p) {
      var larg = itens[0].getBoundingClientRect().width +
                 parseFloat(getComputedStyle(trilho).gap || 0);
      trilho.scrollTo({ left: p * larg * porPagina(), behavior: 'smooth' });
    }

    function desenharPontos() {
      if (!pontos) return;
      var n = paginas();
      if (pontos.children.length !== n) {
        pontos.innerHTML = '';
        for (var i = 0; i < n; i++) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'carrossel__ponto';
          b.setAttribute('aria-label', 'Ir para a página ' + (i + 1));
          b.addEventListener('click', (function (idx) {
            return function () { irPara(idx); };
          })(i));
          pontos.appendChild(b);
        }
      }
    }

    function atualizar() {
      var p = paginaAtual(), n = paginas();
      if (anterior) anterior.disabled = trilho.scrollLeft <= 2;
      if (proximo)  proximo.disabled  = trilho.scrollLeft + trilho.clientWidth >= trilho.scrollWidth - 2;
      if (pontos) {
        desenharPontos();
        $$('.carrossel__ponto', pontos).forEach(function (b, i) {
          b.classList.toggle('is-ativo', i === p);
          b.setAttribute('aria-current', i === p ? 'true' : 'false');
        });
      }
      if (contador) contador.textContent = (p + 1) + ' / ' + n;
    }

    if (anterior) anterior.addEventListener('click', function () { irPara(Math.max(0, paginaAtual() - 1)); });
    if (proximo)  proximo.addEventListener('click',  function () { irPara(Math.min(paginas() - 1, paginaAtual() + 1)); });

    trilho.addEventListener('scroll', function () {
      window.clearTimeout(trilho._t);
      trilho._t = window.setTimeout(atualizar, 90);
    }, { passive: true });

    // teclado, quando o trilho está em foco
    trilho.setAttribute('tabindex', '0');
    trilho.setAttribute('role', 'group');
    trilho.setAttribute('aria-label', raiz.getAttribute('data-rotulo') || 'Carrossel');
    trilho.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); irPara(Math.min(paginas() - 1, paginaAtual() + 1)); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); irPara(Math.max(0, paginaAtual() - 1)); }
    });

    window.addEventListener('resize', function () {
      window.clearTimeout(raiz._r);
      raiz._r = window.setTimeout(atualizar, 160);
    });

    atualizar();
  }

  function iniciarCarrosseis(raiz) { $$('[data-carrossel]', raiz).forEach(iniciarCarrossel); }

  /* ----------------------------------------------------------------------
     UPLOAD DE ARQUIVO
     Arrastar e soltar, ou clicar. Valida tipo e tamanho antes de aceitar.
     ------------------------------------------------------------------- */
  var ICONE_X = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function tamanhoLegivel(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
  }

  function iniciarUpload(raiz) {
    var input = $('input[type="file"]', raiz);
    if (!input) return;

    var lista    = $('#' + (raiz.getAttribute('data-lista') || '')) || raiz.nextElementSibling;
    var maxBytes = Number(raiz.getAttribute('data-max-mb') || 5) * 1024 * 1024;
    var tipos    = (raiz.getAttribute('data-tipos') || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    var arquivos = [];

    function valida(f) {
      if (tipos.length && tipos.indexOf(f.type) < 0) return 'Formato não aceito.';
      if (f.size > maxBytes) return 'Passa de ' + Math.round(maxBytes / 1024 / 1024) + ' MB.';
      return null;
    }

    function desenhar() {
      if (!lista || !lista.classList.contains('upload-lista')) return;
      lista.innerHTML = '';
      arquivos.forEach(function (item, i) {
        var li = document.createElement('div');
        li.className = 'upload-item' + (item.erro ? ' upload-item--erro' : '');
        li.innerHTML =
          '<span class="upload-item__nome"></span>' +
          (item.erro ? '<span class="upload-item__erro"></span>' : '<span class="upload-item__peso"></span>') +
          '<button type="button" class="upload-item__x" aria-label="Remover arquivo">' + ICONE_X + '</button>';
        $('.upload-item__nome', li).textContent = item.arquivo.name;
        if (item.erro) $('.upload-item__erro', li).textContent = item.erro;
        else $('.upload-item__peso', li).textContent = tamanhoLegivel(item.arquivo.size);
        $('.upload-item__x', li).addEventListener('click', function () {
          arquivos.splice(i, 1);
          desenhar();
          raiz.dispatchEvent(new CustomEvent('osc:arquivos', { detail: aceitos() }));
        });
        lista.appendChild(li);
      });
    }

    function aceitos() { return arquivos.filter(function (a) { return !a.erro; }).map(function (a) { return a.arquivo; }); }

    function adicionar(fileList) {
      var varios = input.multiple;
      if (!varios) arquivos = [];
      Array.prototype.forEach.call(fileList, function (f) {
        arquivos.push({ arquivo: f, erro: valida(f) });
      });
      if (!varios) arquivos = arquivos.slice(-1);
      desenhar();
      raiz.dispatchEvent(new CustomEvent('osc:arquivos', { detail: aceitos() }));
    }

    input.addEventListener('change', function () { if (input.files.length) adicionar(input.files); });

    ['dragenter', 'dragover'].forEach(function (ev) {
      raiz.addEventListener(ev, function (e) { e.preventDefault(); raiz.classList.add('is-arrastando'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      raiz.addEventListener(ev, function (e) { e.preventDefault(); raiz.classList.remove('is-arrastando'); });
    });
    raiz.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files.length) adicionar(e.dataTransfer.files);
    });

    raiz.oscArquivos = aceitos;
    raiz.oscLimpar = function () { arquivos = []; input.value = ''; desenhar(); };
  }

  function iniciarUploads(raiz) { $$('[data-upload]', raiz).forEach(iniciarUpload); }

  /* ----------------------------------------------------------------------
     GRUPO DE BOTÕES — seleção única
     ------------------------------------------------------------------- */
  function iniciarGrupos(raiz) {
    $$('[data-btn-grupo]', raiz).forEach(function (g) {
      var itens = $$('.btn-grupo__item', g);
      itens.forEach(function (b) {
        b.addEventListener('click', function () {
          itens.forEach(function (o) {
            o.classList.toggle('is-ativo', o === b);
            o.setAttribute('aria-selected', o === b ? 'true' : 'false');
          });
          g.dispatchEvent(new CustomEvent('osc:escolha', { detail: b.getAttribute('data-valor') || b.textContent.trim() }));
        });
      });
    });
  }

  /* ----------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------- */
  function iniciarTudo(raiz) {
    iniciarAvatares(raiz);
    iniciarCarrosseis(raiz);
    iniciarUploads(raiz);
    iniciarGrupos(raiz);
  }

  window.OSCComp = {
    iniciarTudo: iniciarTudo,
    avatar: { montar: montarAvatar, atualizar: atualizarAvatar, iniciais: iniciais },
    tamanhoLegivel: tamanhoLegivel
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { iniciarTudo(document); });
  } else {
    iniciarTudo(document);
  }
})();

/* ==========================================================================
   OSC — Mega menu e barra de progresso
   Carregado depois do bloco principal, no mesmo arquivo.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ----------------------------------------------------------------------
     MEGA MENU
     Abre no clique (não no passar do mouse: no toque não existe hover, e
     abrir sem querer atrapalha mais do que ajuda). Fecha no Esc, no clique
     fora e ao escolher um caminho.
     ------------------------------------------------------------------- */
  function iniciarMega() {
    var gatilhos = $$('[data-mega]');
    if (!gatilhos.length) return;

    var fundo = $('.mega__fundo');
    if (!fundo) {
      fundo = document.createElement('div');
      fundo.className = 'mega__fundo';
      document.body.appendChild(fundo);
    }

    var aberto = null;

    function posicionar(painel) {
      var nav = $('#navbar');
      var alturaNav = nav ? nav.getBoundingClientRect().bottom : 72;
      painel.style.top = Math.round(alturaNav) + 'px';
    }

    function fechar() {
      if (!aberto) return;
      aberto.painel.classList.remove('is-aberto');
      aberto.gatilho.setAttribute('aria-expanded', 'false');
      fundo.classList.remove('is-aberto');
      aberto = null;
    }

    function abrir(gatilho, painel) {
      fechar();
      posicionar(painel);
      painel.classList.add('is-aberto');
      gatilho.setAttribute('aria-expanded', 'true');
      fundo.classList.add('is-aberto');
      aberto = { gatilho: gatilho, painel: painel };
    }

    gatilhos.forEach(function (g) {
      var painel = $('#' + g.getAttribute('data-mega'));
      if (!painel) return;

      g.setAttribute('aria-expanded', 'false');
      g.setAttribute('aria-controls', painel.id);

      g.addEventListener('click', function (e) {
        e.stopPropagation();
        if (aberto && aberto.gatilho === g) fechar();
        else abrir(g, painel);
      });

      painel.addEventListener('click', function (e) { e.stopPropagation(); });
      $$('a', painel).forEach(function (a) { a.addEventListener('click', fechar); });
    });

    document.addEventListener('click', fechar);
    fundo.addEventListener('click', fechar);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });
    window.addEventListener('scroll', function () { if (aberto) posicionar(aberto.painel); }, { passive: true });
    window.addEventListener('resize', fechar);
  }

  /* ----------------------------------------------------------------------
     BARRA DE PROGRESSO DE LEITURA
     Só aparece em página longa — numa curta ela não diz nada.
     ------------------------------------------------------------------- */
  function iniciarProgresso() {
    var barra = $('#progresso-barra');
    if (!barra) return;

    function medir() {
      var total = document.documentElement.scrollHeight - window.innerHeight;
      if (total < 800) { barra.style.width = '0%'; return; }
      var pct = Math.min(100, Math.max(0, (window.scrollY / total) * 100));
      barra.style.width = pct.toFixed(1) + '%';
    }
    medir();
    window.addEventListener('scroll', medir, { passive: true });
    window.addEventListener('resize', medir);
  }

  function boot() { iniciarMega(); iniciarProgresso(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
