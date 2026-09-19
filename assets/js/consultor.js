/* ==========================================================================
   OSC — Consultor com IA (conversa)
   --------------------------------------------------------------------------
   A aba "Conversar com o consultor" da seção de diagnóstico.

   O navegador nunca fala com o Gemini: manda o histórico para /api/consultor,
   e o servidor é quem guarda a chave e o papel do agente. Assim a chave não
   aparece no código da página e ninguém reescreve as regras do consultor
   digitando no chat.

   O histórico fica só na memória desta aba. Recarregou, começa do zero — é
   diagnóstico rápido, não atendimento com protocolo.
   ========================================================================== */
(function () {
  'use strict';

  var chat = document.getElementById('chat');
  if (!chat) return;

  var fluxo     = document.getElementById('chat-fluxo');
  var form      = document.getElementById('chat-form');
  var campo     = document.getElementById('chat-texto');
  var enviarBtn = document.getElementById('chat-enviar');
  var erroEl    = document.getElementById('chat-erro');
  var sugestoes = document.getElementById('chat-sugestoes');
  var ENDPOINT  = chat.getAttribute('data-endpoint') || '/api/consultor';

  var historico = [];        // [{ papel: 'pessoa' | 'ia', texto }]
  var ocupado   = false;

  /* ----------------------------------------------------------------------
     Markdown mínimo → HTML

     O consultor responde em Markdown (títulos, negrito, listas). Em vez de
     carregar uma biblioteca, converte-se à mão o punhado de marcas que o
     prompt pede.

     A regra de ouro: escapar PRIMEIRO, formatar DEPOIS. O texto vem de um
     modelo de linguagem, que por sua vez recebeu texto do visitante — se
     fosse direto para innerHTML, uma resposta com "<img onerror=...>" viraria
     HTML de verdade nesta página.
     ------------------------------------------------------------------- */
  function escapar(t) {
    return String(t)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function inline(t) {
    return t
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function markdown(texto) {
    var linhas = escapar(texto).split(/\r?\n/);
    var saida = [];
    var lista = null;          // 'ul' | 'ol' | null

    function fecharLista() {
      if (lista) { saida.push('</' + lista + '>'); lista = null; }
    }

    linhas.forEach(function (linha) {
      var l = linha.trim();

      if (!l) { fecharLista(); return; }

      var titulo = l.match(/^(#{1,4})\s+(.*)$/);
      if (titulo) {
        fecharLista();
        // h2/h3 no documento: a seção já tem um h2 próprio, então descemos um nível
        var nivel = Math.min(titulo[1].length + 1, 4);
        saida.push('<h' + nivel + '>' + inline(titulo[2]) + '</h' + nivel + '>');
        return;
      }

      var marcador = l.match(/^[-*•]\s+(.*)$/);
      if (marcador) {
        if (lista !== 'ul') { fecharLista(); saida.push('<ul>'); lista = 'ul'; }
        saida.push('<li>' + inline(marcador[1]) + '</li>');
        return;
      }

      var numerada = l.match(/^\d+[.)]\s+(.*)$/);
      if (numerada) {
        if (lista !== 'ol') { fecharLista(); saida.push('<ol>'); lista = 'ol'; }
        saida.push('<li>' + inline(numerada[1]) + '</li>');
        return;
      }

      if (/^(-{3,}|_{3,}|\*{3,})$/.test(l)) { fecharLista(); saida.push('<hr />'); return; }

      fecharLista();
      saida.push('<p>' + inline(l) + '</p>');
    });

    fecharLista();
    return saida.join('');
  }

  /* ----------------------------------------------------------------------
     Bolhas
     ------------------------------------------------------------------- */
  function bolha(papel, html, classeExtra) {
    var msg = document.createElement('div');
    msg.className = 'chat__msg chat__msg--' + (papel === 'ia' ? 'ia' : 'pessoa') +
                    (classeExtra ? ' ' + classeExtra : '');
    var balao = document.createElement('div');
    balao.className = 'chat__balao';
    balao.innerHTML = html;
    msg.appendChild(balao);
    fluxo.appendChild(msg);
    rolarAoFim();
    return msg;
  }

  function rolarAoFim() {
    // rola o próprio fluxo, não a página: a pessoa pode estar lendo outra parte
    fluxo.scrollTop = fluxo.scrollHeight;
  }

  function pensando() {
    var msg = bolha('ia', '<span class="chat__pontos" aria-hidden="true">' +
      '<i></i><i></i><i></i></span>' +
      '<span class="sr-only">O consultor está escrevendo…</span>', 'chat__msg--pensando');
    return msg;
  }

  function mostrarErro(texto) {
    erroEl.textContent = texto;
    erroEl.hidden = false;
  }

  function limparErro() {
    erroEl.hidden = true;
    erroEl.textContent = '';
  }

  function travar(v) {
    ocupado = v;
    enviarBtn.disabled = v;
    campo.disabled = v;
    chat.classList.toggle('is-ocupado', v);
  }

  /* ----------------------------------------------------------------------
     Envio
     ------------------------------------------------------------------- */
  function enviar(texto) {
    texto = String(texto || '').trim();
    if (!texto || ocupado) return;

    limparErro();
    if (sugestoes) sugestoes.hidden = true;

    bolha('pessoa', '<p>' + inline(escapar(texto)) + '</p>');
    historico.push({ papel: 'pessoa', texto: texto });

    campo.value = '';
    ajustarAltura();
    travar(true);

    var espera = pensando();

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // só os últimos 16 turnos: o servidor corta de novo, aqui é para não
      // mandar quilobytes à toa
      body: JSON.stringify({ historico: historico.slice(-16) })
    })
      .then(function (r) {
        return r.json().catch(function () { return { ok: false }; })
          .then(function (j) { return { status: r.status, corpo: j }; });
      })
      .then(function (r) {
        espera.remove();

        if (r.corpo && r.corpo.ok && r.corpo.resposta) {
          historico.push({ papel: 'ia', texto: r.corpo.resposta });
          bolha('ia', markdown(r.corpo.resposta));
          rodapeDeContato();
          return;
        }

        // o servidor manda uma mensagem pronta para o visitante; se não vier,
        // usamos uma nossa em vez de mostrar código de erro
        var msg = (r.corpo && r.corpo.mensagem) ||
          'O consultor não respondeu agora. Tente de novo em alguns minutos.';
        mostrarErro(msg);
        // a última pergunta volta para o campo, para não se perder
        historico.pop();
        campo.value = texto;
        ajustarAltura();
      })
      .catch(function () {
        espera.remove();
        mostrarErro('Não conseguimos falar com o servidor. Verifique a conexão e tente de novo.');
        historico.pop();
        campo.value = texto;
        ajustarAltura();
      })
      .then(function () {
        travar(false);
        campo.focus();
      });
  }

  /* Depois do primeiro diagnóstico fechado, oferece o caminho humano uma vez só. */
  var ofereceu = false;
  function rodapeDeContato() {
    if (ofereceu || historico.length < 4) return;
    ofereceu = true;

    var base = (window.OSC && window.OSC.whatsBase)
      ? window.OSC.whatsBase() + encodeURIComponent(
          'Olá! Conversei com o consultor de IA no site e quero aprofundar o diagnóstico da minha empresa.')
      : 'https://wa.me/5586994984623';

    var div = document.createElement('div');
    div.className = 'chat__cta';
    var a = document.createElement('a');
    a.className = 'btn btn--primary';
    a.href = base;
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = '<span>Falar com um especialista</span>' +
                  '<span class="btn__dot" aria-hidden="true"></span>';
    div.appendChild(a);
    fluxo.appendChild(div);
    rolarAoFim();
  }

  /* ----------------------------------------------------------------------
     Campo que cresce com o texto
     ------------------------------------------------------------------- */
  function ajustarAltura() {
    campo.style.height = 'auto';
    campo.style.height = Math.min(campo.scrollHeight, 160) + 'px';
  }

  campo.addEventListener('input', ajustarAltura);

  campo.addEventListener('keydown', function (e) {
    // Enter envia; Shift+Enter quebra linha. No celular o teclado tem "enviar",
    // então a checagem de largura evita engolir a quebra de linha ali.
    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 1024) {
      e.preventDefault();
      enviar(campo.value);
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    enviar(campo.value);
  });

  if (sugestoes) {
    sugestoes.addEventListener('click', function (e) {
      var b = e.target.closest('.chat__sug');
      if (b) enviar(b.textContent.trim());
    });
  }

  /* ----------------------------------------------------------------------
     Abas da seção de diagnóstico
     ------------------------------------------------------------------- */
  var abas = document.querySelectorAll('.abas__btn');
  if (abas.length) {
    Array.prototype.forEach.call(abas, function (btn) {
      btn.addEventListener('click', function () {
        Array.prototype.forEach.call(abas, function (outro) {
          var alvo = document.getElementById(outro.getAttribute('data-aba'));
          var ativa = outro === btn;
          outro.classList.toggle('is-ativa', ativa);
          outro.setAttribute('aria-selected', ativa ? 'true' : 'false');
          if (alvo) alvo.hidden = !ativa;
        });
        if (btn.getAttribute('data-aba') === 'painel-consultor') {
          ajustarAltura();
          campo.focus();
        }
      });
    });
  }

  ajustarAltura();
})();
