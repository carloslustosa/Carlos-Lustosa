/* ==========================================================================
   OSC — Diagnóstico com IA
   --------------------------------------------------------------------------
   Coleta os dados da empresa, pede o relatório ao servidor e desenha o
   resultado na página.

   A chave do Gemini NÃO passa por aqui. O navegador fala com /api/relatorio,
   no próprio domínio, e é o servidor que guarda a chave. Se o site estiver
   publicado como HTML estático, esse endpoint não existe: o formulário avisa
   e oferece o WhatsApp.
   ========================================================================== */
(function () {
  'use strict';

  var form = document.getElementById('relatorio-form');
  if (!form) return;

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var painel    = $('#relatorio-saida');
  var carregando = $('#relatorio-carregando');
  var erroBox   = $('#relatorio-erro');
  var botao     = form.querySelector('button[type="submit"]');
  var ENDPOINT  = form.getAttribute('data-endpoint') || '/api/relatorio';

  var esc = function (t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  var mostrar = function (el, visivel) { if (el) el.hidden = !visivel; };

  var aviso = function (texto) {
    if (!erroBox) return;
    erroBox.innerHTML = texto;
    mostrar(erroBox, Boolean(texto));
  };

  /* ----------------------------------------------------------------------
     Desenho do relatório
     ------------------------------------------------------------------- */
  function listaSimples(itens) {
    if (!itens || !itens.length) return '';
    return '<ul class="rel__chips">' +
      itens.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') +
      '</ul>';
  }

  function blocos(itens) {
    if (!itens || !itens.length) return '';
    return '<div class="rel__grid">' + itens.map(function (i) {
      return '<div class="rel__item">' +
               '<h4>' + esc(i.titulo) + '</h4>' +
               '<p>' + esc(i.texto) + '</p>' +
             '</div>';
    }).join('') + '</div>';
  }

  function passos(itens) {
    if (!itens || !itens.length) return '';
    return '<ol class="rel__passos">' + itens.map(function (i) {
      return '<li><span class="rel__prazo">' + esc(i.prazo) + '</span>' +
             '<span>' + esc(i.acao) + '</span></li>';
    }).join('') + '</ol>';
  }

  function desenhar(r, empresa) {
    var nivel = (r.maturidade && r.maturidade.nivel) || '';
    var chave = nivel.toLowerCase().indexOf('pronta') >= 0 ? 'pronta'
              : nivel.toLowerCase().indexOf('estrutura') >= 0 ? 'media' : 'inicial';

    var html = '' +
      '<header class="rel__topo">' +
        '<p class="descriptor text-cream/45">Diagnóstico OSC</p>' +
        '<h3 class="rel__empresa">' + esc(empresa) + '</h3>' +
        '<span class="rel__selo rel__selo--' + chave + '">' + esc(nivel) + '</span>' +
        '<p class="rel__just">' + esc(r.maturidade && r.maturidade.justificativa) + '</p>' +
      '</header>' +

      '<div class="rel__resumo"><p>' + esc(r.resumo) + '</p></div>' +

      '<section class="rel__sec"><h4 class="rel__h">Onde sua empresa está</h4>' + blocos(r.diagnostico) + '</section>' +
      '<section class="rel__sec"><h4 class="rel__h">Prospecção no mercado público</h4>' + blocos(r.oportunidades) + '</section>' +

      '<section class="rel__sec"><h4 class="rel__h">Quem costuma comprar isso</h4>' + listaSimples(r.orgaos) + '</section>' +
      '<section class="rel__sec"><h4 class="rel__h">Termos para buscar no PNCP</h4>' + listaSimples(r.palavrasChave) + '</section>' +
      '<section class="rel__sec"><h4 class="rel__h">Documentos para deixar prontos</h4>' + listaSimples(r.documentos) + '</section>' +

      '<section class="rel__sec"><h4 class="rel__h">Onde esse perfil costuma tropeçar</h4>' + blocos(r.riscos) + '</section>' +
      '<section class="rel__sec"><h4 class="rel__h">Próximos passos</h4>' + passos(r.proximosPassos) + '</section>' +

      '<div class="note note--warn rel__nota">' +
        '<p><strong>Como ler este relatório.</strong> Ele foi gerado por inteligência ' +
        'artificial a partir do que você informou, e serve como ponto de partida. ' +
        'Não consulta editais em tempo real, não cita contratação em aberto e não ' +
        'garante resultado em disputa pública. Quem manda, sempre, é o edital.</p>' +
      '</div>' +

      '<div class="rel__acoes">' +
        '<a href="#contato" class="btn btn--primary btn--lg"><span>Quero a OSC executando isso</span><span class="btn__dot" aria-hidden="true"></span></a>' +
        '<button type="button" class="btn btn--ghost" id="rel-imprimir"><span>Salvar em PDF</span></button>' +
      '</div>';

    painel.innerHTML = html;
    mostrar(painel, true);

    var imprimir = $('#rel-imprimir');
    if (imprimir) imprimir.addEventListener('click', function () { window.print(); });

    painel.setAttribute('tabindex', '-1');
    painel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    painel.focus({ preventScroll: true });
  }

  /* ----------------------------------------------------------------------
     Envio
     ------------------------------------------------------------------- */
  /* A barra de título do painel mostra em que pé está a geração. */
  function estadoDoPainel(texto) {
    var el = document.getElementById('painel-estado');
    if (el) el.textContent = texto;
  }

  var enviando = false;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (enviando) return;

    var pega = function (nome) {
      var el = form.elements[nome];
      return el ? el.value.trim() : '';
    };

    // armadilha anti-robô
    if (pega('website')) return;

    var obrigatorios = $$('input[required], select[required], textarea[required]', form);
    var falho = null;
    obrigatorios.forEach(function (f) {
      var ok = f.value.trim() !== '' &&
               (f.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.value.trim()));
      f.classList.toggle('is-invalid', !ok);
      if (!ok && !falho) falho = f;
    });
    if (falho) {
      aviso('Confira os campos destacados antes de gerar.');
      falho.focus();
      return;
    }

    aviso('');
    mostrar(painel, false);
    mostrar(carregando, true);
    estadoDoPainel('analisando');
    enviando = true;
    if (botao) botao.disabled = true;

    var dados = {
      empresa:     pega('empresa'),
      segmento:    pega('segmento'),
      atividade:   pega('atividade'),
      porte:       pega('porte'),
      estado:      pega('estado'),
      experiencia: pega('experiencia'),
      faturamento: pega('faturamento')
    };

    // Grava o lead em paralelo. Falhar aqui não pode impedir o relatório.
    if (window.OSC && window.OSC.salvarLead) {
      var lead = {
        nome:     pega('nome'),
        empresa:  dados.empresa,
        whatsapp: pega('whatsapp'),
        email:    pega('email'),
        segmento: dados.segmento || null,
        mensagem: [
          'Pediu o diagnóstico com IA.',
          'Atividade: '   + dados.atividade,
          'Porte: '       + dados.porte,
          'Estado: '      + dados.estado,
          'Experiência: ' + dados.experiencia,
          'Faturamento: ' + (dados.faturamento || 'não informado')
        ].join(' | ')
      };
      var origem = window.OSC.origemDoLead ? window.OSC.origemDoLead() : {};
      for (var k in origem) { if (origem[k]) lead[k] = origem[k]; }
      lead.origem = 'relatorio-ia';
      window.OSC.salvarLead(lead);
    }

    var terminou = function () {
      enviando = false;
      if (botao) botao.disabled = false;
      mostrar(carregando, false);
      estadoDoPainel('pronto');
    };

    var zap = (window.OSC && window.OSC.whatsBase)
      ? window.OSC.whatsBase() + encodeURIComponent('Oi! Tentei gerar o diagnóstico no site e quero falar com um especialista.')
      : 'https://wa.me/5586994984623';

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    })
      .then(function (res) {
        return res.json().then(function (corpo) { return { status: res.status, corpo: corpo }; });
      })
      .then(function (r) {
        terminou();
        if (r.corpo && r.corpo.ok && r.corpo.relatorio) {
          desenhar(r.corpo.relatorio, dados.empresa);
          return;
        }
        var msg = (r.corpo && r.corpo.mensagem) || 'Não conseguimos gerar o diagnóstico agora.';
        aviso(esc(msg) + ' <a href="' + zap + '" target="_blank" rel="noopener">Falar no WhatsApp</a>');
      })
      .catch(function () {
        terminou();
        aviso('Não conseguimos gerar o diagnóstico agora. ' +
              '<a href="' + zap + '" target="_blank" rel="noopener">Fale com a gente no WhatsApp</a> ' +
              'que fazemos o diagnóstico com você.');
      });
  });
})();
