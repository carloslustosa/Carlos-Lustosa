/* ==========================================================================
   OSC — Contas do cliente
   --------------------------------------------------------------------------
   Cuida do cadastro, do login, do perfil e do avatar no cabeçalho.

   A senha nunca passa por aqui além do envio: quem guarda a sessão é um
   cookie httpOnly, que este JavaScript não consegue ler. Se o servidor não
   estiver com as contas ligadas, a página avisa em vez de quebrar.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var API = '/api/conta';
  var eu = null;   // { entrou, email, perfil }

  function pedir(caminho, opcoes) {
    var o = opcoes || {};
    return fetch(API + caminho, {
      method: o.metodo || 'GET',
      headers: o.corpo ? { 'Content-Type': 'application/json' } : undefined,
      body: o.corpo ? JSON.stringify(o.corpo) : undefined,
      credentials: 'same-origin'
    }).then(function (r) {
      return r.json()
        .catch(function () { return {}; })
        .then(function (c) { return { status: r.status, corpo: c }; });
    });
  }

  var aviso = function (el, texto, tipo) {
    if (!el) return;
    el.textContent = texto || '';
    el.hidden = !texto;
    el.className = tipo === 'ok' ? 'form__ok' : 'form__error';
  };

  /* ----------------------------------------------------------------------
     Avatar no cabeçalho
     ------------------------------------------------------------------- */
  function pintarCabecalho() {
    var caixa = $('#conta-topo');
    if (!caixa) return;

    if (!eu || !eu.entrou) {
      caixa.innerHTML = '<a href="entrar.html" class="btn btn--ghost conta-topo__entrar">' +
                        '<span>Entrar</span></a>';
      return;
    }

    var perfil = eu.perfil || {};
    var nome = perfil.nome || eu.email || 'Minha conta';
    caixa.innerHTML =
      '<a href="conta.html" class="conta-topo__link" title="' + nome.replace(/"/g, '') + '">' +
        '<span class="avt avt--sm" data-nome="' + nome.replace(/"/g, '') + '"' +
        (perfil.avatar ? ' data-foto="' + perfil.avatar + '"' : '') + '></span>' +
        '<span class="conta-topo__nome">' + (nome.split(' ')[0] || '') + '</span>' +
      '</a>';
    if (window.OSCComp) window.OSCComp.iniciarTudo(caixa);
  }

  function carregarSessao() {
    return pedir('/eu').then(function (r) {
      eu = (r.status === 200 && r.corpo && r.corpo.ok) ? r.corpo : { entrou: false };
      pintarCabecalho();
      return eu;
    }).catch(function () {
      eu = { entrou: false };
      pintarCabecalho();
      return eu;
    });
  }

  /* ----------------------------------------------------------------------
     Página de entrar / criar conta
     ------------------------------------------------------------------- */
  function iniciarEntrar() {
    var caixa = $('#entrar-bloco');
    if (!caixa) return;

    var seletor  = $('#entrar-seletor');
    var fEntrar  = $('#form-entrar');
    var fCriar   = $('#form-criar');
    var avisoE   = $('#entrar-aviso');
    var avisoC   = $('#criar-aviso');

    function mostrar(aba) {
      var criar = aba === 'criar';
      fEntrar.hidden = criar;
      fCriar.hidden  = !criar;
      $$('.btn-grupo__item', seletor).forEach(function (b) {
        var ativo = b.getAttribute('data-valor') === aba;
        b.classList.toggle('is-ativo', ativo);
        b.setAttribute('aria-selected', ativo ? 'true' : 'false');
      });
      aviso(avisoE, ''); aviso(avisoC, '');
    }

    if (seletor) {
      seletor.addEventListener('osc:escolha', function (e) { mostrar(e.detail); });
      $$('.btn-grupo__item', seletor).forEach(function (b) {
        b.addEventListener('click', function () { mostrar(b.getAttribute('data-valor')); });
      });
    }
    if (location.hash === '#criar') mostrar('criar');

    function valida(form, box) {
      var falho = null;
      $$('input[required], select[required]', form).forEach(function (f) {
        var ok = f.value.trim() !== '' &&
                 (f.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.value.trim()));
        if (f.type === 'password' && f.value.length < 8) ok = false;
        f.classList.toggle('is-invalid', !ok);
        if (!ok && !falho) falho = f;
      });
      if (falho) {
        aviso(box, falho.type === 'password'
          ? 'A senha precisa de pelo menos 8 caracteres.'
          : 'Confira os campos destacados.');
        falho.focus();
      }
      return !falho;
    }

    function enviar(form, box, caminho, monta) {
      var botao = form.querySelector('button[type="submit"]');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!valida(form, box)) return;
        aviso(box, '');
        botao.disabled = true;

        pedir(caminho, { metodo: 'POST', corpo: monta(form) })
          .then(function (r) {
            botao.disabled = false;
            if (r.corpo && r.corpo.ok) {
              if (r.corpo.precisaConfirmar) {
                aviso(box, r.corpo.mensagem, 'ok');
                form.reset();
                return;
              }
              var destino = new URLSearchParams(location.search).get('voltar') || 'conta.html';
              location.href = destino;
              return;
            }
            aviso(box, (r.corpo && r.corpo.mensagem) || 'Não foi possível concluir.');
          })
          .catch(function () {
            botao.disabled = false;
            aviso(box, 'Sem conexão com o servidor. Tente de novo.');
          });
      });
    }

    var v = function (form, nome) {
      var el = form.elements[nome];
      return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : '';
    };

    enviar(fEntrar, avisoE, '/entrar', function (f) {
      return { email: v(f, 'email'), senha: f.elements.senha.value };
    });
    enviar(fCriar, avisoC, '/cadastro', function (f) {
      return {
        nome: v(f, 'nome'), email: v(f, 'email'), senha: f.elements.senha.value,
        empresa: v(f, 'empresa'), whatsapp: v(f, 'whatsapp'),
        segmento: v(f, 'segmento'), novidades: v(f, 'novidades')
      };
    });
  }

  /* ----------------------------------------------------------------------
     Página da conta
     ------------------------------------------------------------------- */

  /* Reduz a imagem a 256x256 no navegador. Sobe poucos KB em vez de
     alguns MB, e o servidor não precisa redimensionar nada. */
  function reduzirImagem(arquivo, lado) {
    return new Promise(function (resolve, reject) {
      var leitor = new FileReader();
      leitor.onerror = function () { reject(new Error('leitura')); };
      leitor.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('imagem')); };
        img.onload = function () {
          var c = document.createElement('canvas');
          c.width = lado; c.height = lado;
          var x = c.getContext('2d');
          // recorta o centro, mantendo a proporção
          var min = Math.min(img.width, img.height);
          x.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, lado, lado);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }

  function iniciarConta() {
    var pagina = $('#pagina-conta');
    if (!pagina) return;

    var carregando = $('#conta-carregando');
    var conteudo   = $('#conta-conteudo');
    var form       = $('#form-perfil');
    var box        = $('#perfil-aviso');
    var avatarEl   = $('#conta-avatar');
    var upload     = $('#avatar-upload');
    var btnRemover = $('#avatar-remover');
    var btnSair    = $('#conta-sair');
    var avatarNovo = null;   // data URL pendente

    function preencher() {
      var p = (eu && eu.perfil) || {};
      $('#conta-nome-grande').textContent = p.nome || eu.email || '';
      $('#conta-email').textContent = eu.email || '';
      if (window.OSCComp) window.OSCComp.avatar.atualizar(avatarEl, p.nome || eu.email || '', p.avatar || '');

      ['nome', 'empresa', 'whatsapp', 'cnpj', 'cargo'].forEach(function (k) {
        if (form.elements[k]) form.elements[k].value = p[k] || '';
      });
      if (form.elements.segmento) form.elements.segmento.value = p.segmento || '';
      if (form.elements.novidades) form.elements.novidades.checked = Boolean(p.aceita_novidades);
    }

    carregarSessao().then(function () {
      if (!eu.entrou) {
        location.href = 'entrar.html?voltar=' + encodeURIComponent('conta.html');
        return;
      }
      carregando.hidden = true;
      conteudo.hidden = false;
      preencher();
      if (window.OSCComp) window.OSCComp.iniciarTudo(conteudo);
    });

    if (upload) {
      upload.addEventListener('osc:arquivos', function (e) {
        var arq = e.detail && e.detail[0];
        if (!arq) return;
        aviso(box, '');
        reduzirImagem(arq, 256)
          .then(function (dataUrl) {
            avatarNovo = dataUrl;
            if (window.OSCComp) {
              window.OSCComp.avatar.atualizar(avatarEl, (eu.perfil && eu.perfil.nome) || '', dataUrl);
            }
            aviso(box, 'Foto pronta. Salve para confirmar.', 'ok');
          })
          .catch(function () { aviso(box, 'Não conseguimos ler essa imagem.'); });
      });
    }

    if (btnRemover) {
      btnRemover.addEventListener('click', function () {
        avatarNovo = null;
        if (window.OSCComp) window.OSCComp.avatar.atualizar(avatarEl, (eu.perfil && eu.perfil.nome) || '', '');
        if (upload && upload.oscLimpar) upload.oscLimpar();
        form.dataset.removerAvatar = '1';
        aviso(box, 'Foto removida. Salve para confirmar.', 'ok');
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var botao = form.querySelector('button[type="submit"]');
      var nome = form.elements.nome.value.trim();
      if (nome.length < 2) {
        form.elements.nome.classList.add('is-invalid');
        aviso(box, 'Diga seu nome.');
        return;
      }
      form.elements.nome.classList.remove('is-invalid');

      var dados = {
        nome: nome,
        empresa:  form.elements.empresa.value.trim(),
        whatsapp: form.elements.whatsapp.value.trim(),
        cnpj:     form.elements.cnpj.value.trim(),
        cargo:    form.elements.cargo.value.trim(),
        segmento: form.elements.segmento.value,
        novidades: form.elements.novidades.checked
      };
      if (avatarNovo) dados.avatar = avatarNovo;
      else if (form.dataset.removerAvatar === '1') dados.avatar = null;

      botao.disabled = true;
      aviso(box, 'Salvando…', 'ok');

      pedir('/perfil', { metodo: 'POST', corpo: dados })
        .then(function (r) {
          botao.disabled = false;
          if (r.corpo && r.corpo.ok) {
            eu.perfil = r.corpo.perfil || eu.perfil;
            avatarNovo = null;
            delete form.dataset.removerAvatar;
            if (upload && upload.oscLimpar) upload.oscLimpar();
            preencher();
            pintarCabecalho();
            aviso(box, 'Pronto, salvamos.', 'ok');
          } else {
            aviso(box, (r.corpo && r.corpo.mensagem) || 'Não conseguimos salvar.');
          }
        })
        .catch(function () {
          botao.disabled = false;
          aviso(box, 'Sem conexão com o servidor. Tente de novo.');
        });
    });

    if (btnSair) {
      btnSair.addEventListener('click', function () {
        btnSair.disabled = true;
        pedir('/sair', { metodo: 'POST' }).then(function () { location.href = 'index.html'; })
          .catch(function () { location.href = 'index.html'; });
      });
    }
  }

  /* ----------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------- */
  function boot() {
    iniciarEntrar();
    if ($('#pagina-conta')) { iniciarConta(); return; }
    if ($('#conta-topo')) carregarSessao();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
