/**
 * OSC — servidor estático
 * ---------------------------------------------------------------------------
 * Serve os arquivos do site. Sem nenhuma dependência: usa só o que já vem no
 * Node, então `npm install` não precisa baixar nada.
 *
 * É isto que roda quando a Hostinger executa `npm start` numa aplicação Node.
 * Em hospedagem estática comum (enviar os arquivos por FTP ou pelo Gerenciador
 * de Arquivos) este arquivo não é usado — o servidor da Hostinger entrega o
 * index.html sozinho.
 *
 * Porta: usa a variável de ambiente PORT, que a Hostinger define. Sem ela, 3000.
 *
 * Também expõe POST /api/relatorio, que gera o diagnóstico com IA. A chave do
 * Gemini fica em GEMINI_API_KEY, no ambiente — nunca no código do site. Se ela
 * não estiver definida, o endpoint responde 503 e o site usa o caminho normal
 * do formulário.
 */
'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const RAIZ  = __dirname;
const PORTA = Number(process.env.PORT) || 3000;
const HOST  = process.env.HOST || '0.0.0.0';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.txt':  'text/plain; charset=utf-8',
  '.xml':  'application/xml; charset=utf-8',
  '.pdf':  'application/pdf'
};

/* Arquivos que nunca devem ser servidos pela web */
const BLOQUEADOS = new Set(['.git', 'node_modules', 'database', 'build.py', 'server.js', 'package.json', 'package-lock.json']);

function ehBloqueado(relativo) {
  const primeiro = relativo.split(path.sep)[0];
  return BLOQUEADOS.has(primeiro) || primeiro.startsWith('.');
}

function enviar(res, status, corpo, cabecalhos) {
  res.writeHead(status, Object.assign({
    'X-Content-Type-Options': 'nosniff'
  }, cabecalhos || {}));
  res.end(corpo);
}

/* =========================================================================
   API DO RELATÓRIO — POST /api/relatorio
   ========================================================================= */

const GEMINI_KEY   = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL   = process.env.GEMINI_URL ||
  'https://generativelanguage.googleapis.com/v1beta/models';

/* Limite por IP: protege a cota da conta de uso abusivo.
   Um endpoint de IA aberto na internet é convite para queimar crédito. */
const LIMITE_POR_IP   = Number(process.env.LIMITE_POR_IP || 5);
const JANELA_MS       = 60 * 60 * 1000;          // 1 hora
const LIMITE_GLOBAL   = Number(process.env.LIMITE_GLOBAL || 200);  // por hora
const usos = new Map();
let usoGlobal = { contador: 0, reinicia: Date.now() + JANELA_MS };

function ipDoPedido(req) {
  const encaminhado = req.headers['x-forwarded-for'];
  if (encaminhado) return String(encaminhado).split(',')[0].trim();
  return req.socket.remoteAddress || 'desconhecido';
}

/* Consultar e registrar são separados de propósito: só chamada que realmente
   vai ao Gemini gasta cota. Quem errou um campo e reenviou não é punido. */
function dentroDoLimite(ip) {
  const agora = Date.now();

  if (agora > usoGlobal.reinicia) usoGlobal = { contador: 0, reinicia: agora + JANELA_MS };
  if (usoGlobal.contador >= LIMITE_GLOBAL) return false;

  const registro = usos.get(ip);
  if (registro && agora <= registro.reinicia && registro.contador >= LIMITE_POR_IP) return false;

  return true;
}

function registrarUso(ip) {
  const agora = Date.now();
  const registro = usos.get(ip);

  if (!registro || agora > registro.reinicia) {
    usos.set(ip, { contador: 1, reinicia: agora + JANELA_MS });
  } else {
    registro.contador += 1;
  }
  usoGlobal.contador += 1;

  // limpeza preguiçosa, para o Map não crescer sem fim
  if (usos.size > 5000) {
    for (const [chave, valor] of usos) if (agora > valor.reinicia) usos.delete(chave);
  }
}

function lerCorpo(req, limiteBytes = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let dados = '';
    let tamanho = 0;
    let estourou = false;

    req.on('data', (pedaco) => {
      if (estourou) return;
      tamanho += pedaco.length;
      if (tamanho > limiteBytes) {
        estourou = true;
        // Não destruímos o socket: sem ele não há como responder 413.
        // Só paramos de guardar e deixamos o resto do corpo escoar.
        dados = '';
        req.resume();
        reject(new Error('corpo grande demais'));
        return;
      }
      dados += pedaco;
    });

    req.on('end', () => {
      if (estourou) return;
      try { resolve(JSON.parse(dados || '{}')); }
      catch (e) { reject(new Error('json inválido')); }
    });

    req.on('error', reject);
  });
}

const limpar = (valor, max) => String(valor == null ? '' : valor).replace(/\s+/g, ' ').trim().slice(0, max);

/* O formato que pedimos ao modelo. Devolver JSON estruturado deixa a página
   montar o relatório no desenho da marca, em vez de despejar texto solto. */
const ESQUEMA = {
  type: 'object',
  properties: {
    resumo:        { type: 'string' },
    maturidade:    { type: 'object', properties: {
                       nivel:        { type: 'string' },
                       justificativa:{ type: 'string' }
                     }, required: ['nivel', 'justificativa'] },
    diagnostico:   { type: 'array', items: { type: 'object', properties: {
                       titulo: { type: 'string' }, texto: { type: 'string' }
                     }, required: ['titulo', 'texto'] } },
    oportunidades: { type: 'array', items: { type: 'object', properties: {
                       titulo: { type: 'string' }, texto: { type: 'string' }
                     }, required: ['titulo', 'texto'] } },
    orgaos:        { type: 'array', items: { type: 'string' } },
    palavrasChave: { type: 'array', items: { type: 'string' } },
    documentos:    { type: 'array', items: { type: 'string' } },
    riscos:        { type: 'array', items: { type: 'object', properties: {
                       titulo: { type: 'string' }, texto: { type: 'string' }
                     }, required: ['titulo', 'texto'] } },
    proximosPassos:{ type: 'array', items: { type: 'object', properties: {
                       prazo: { type: 'string' }, acao: { type: 'string' }
                     }, required: ['prazo', 'acao'] } }
  },
  required: ['resumo', 'maturidade', 'diagnostico', 'oportunidades',
             'orgaos', 'palavrasChave', 'documentos', 'riscos', 'proximosPassos']
};

function montarPrompt(d) {
  return [
    'Você é consultor sênior da OSC Gestão Empresarial e Licitações, especialista em',
    'contratações públicas no Brasil sob a Lei 14.133/2021. Escreva um diagnóstico',
    'para o empresário abaixo.',
    '',
    'DADOS DA EMPRESA',
    'Empresa: '        + d.empresa,
    'Segmento: '       + d.segmento,
    'O que faz: '      + d.atividade,
    'Porte: '          + d.porte,
    'Estado: '         + d.estado,
    'Experiência com licitações: ' + d.experiencia,
    'Faixa de faturamento: '       + (d.faturamento || 'não informada'),
    '',
    'REGRAS OBRIGATÓRIAS',
    '1. Escreva em português do Brasil, direto, frases curtas, verbo no presente.',
    '2. Nada de jargão de edital sem explicar. Fale como quem conversa com um dono de empresa.',
    '3. NUNCA invente dados concretos: não cite número de edital, nome de órgão',
    '   específico com contratação em aberto, valor de contrato, quantidade de',
    '   oportunidades nem estatística. Você não tem acesso a base de dados em tempo real.',
    '   Fale de TIPOS de órgão e TIPOS de contratação que costumam existir no segmento.',
    '4. NUNCA prometa resultado, vitória em licitação ou faturamento garantido.',
    '   Processo público é competitivo e o resultado não depende da OSC.',
    '5. Não invente valores em dinheiro de limites legais: eles mudam por decreto.',
    '   Se precisar mencionar, diga que o valor vigente deve ser conferido no edital ou no PNCP.',
    '6. Seja honesto sobre fragilidades. Um diagnóstico que só elogia não serve para nada.',
    '7. Considere o porte: ME e EPP têm tratamento diferenciado pela LC 123/2006',
    '   (empate ficto, prazo para regularizar fiscal, itens exclusivos e cota reservada).',
    '',
    'O QUE PREENCHER',
    '- resumo: 2 a 3 frases sobre onde a empresa está e qual o caminho mais curto.',
    '- maturidade.nivel: exatamente um entre "Inicial", "Em estruturação" ou "Pronta para disputar".',
    '- maturidade.justificativa: 1 ou 2 frases explicando a escolha.',
    '- diagnostico: 3 a 5 pontos sobre a situação da empresa hoje, com título curto.',
    '- oportunidades: 3 a 5 caminhos de prospecção no mercado público para este segmento.',
    '- orgaos: 4 a 7 TIPOS de órgão que costumam comprar isso (ex.: "prefeituras", "hospitais públicos").',
    '- palavrasChave: 5 a 8 termos de busca para usar no PNCP, ligados ao que a empresa faz.',
    '- documentos: 5 a 8 documentos ou cadastros que esta empresa precisa ter prontos.',
    '- riscos: 2 a 4 armadilhas concretas para este perfil, com título curto.',
    '- proximosPassos: 4 a 6 ações, cada uma com prazo ("nesta semana", "em 30 dias", "em 90 dias").',
    '',
    'Devolva apenas o JSON no formato pedido.'
  ].join('\n');
}

async function gerarRelatorio(dados) {
  const corpo = {
    contents: [{ role: 'user', parts: [{ text: montarPrompt(dados) }] }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: ESQUEMA
    }
  };

  const controle = new AbortController();
  const corta = setTimeout(() => controle.abort(), 60000);

  try {
    const resposta = await fetch(
      GEMINI_URL + '/' + GEMINI_MODEL + ':generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
        body: JSON.stringify(corpo),
        signal: controle.signal
      }
    );

    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => '');
      // registramos no servidor, mas nunca devolvemos ao navegador:
      // a resposta de erro da API pode ecoar a chave
      console.error('[relatorio] Gemini respondeu', resposta.status, detalhe.slice(0, 500));
      const err = new Error('gemini-falhou');
      err.status = resposta.status;
      throw err;
    }

    const json = await resposta.json();
    const texto = json &&
      json.candidates &&
      json.candidates[0] &&
      json.candidates[0].content &&
      json.candidates[0].content.parts &&
      json.candidates[0].content.parts[0] &&
      json.candidates[0].content.parts[0].text;

    if (!texto) throw new Error('resposta-vazia');
    return JSON.parse(texto);
  } finally {
    clearTimeout(corta);
  }
}

async function rotaRelatorio(req, res) {
  if (!GEMINI_KEY) {
    return enviar(res, 503, JSON.stringify({
      ok: false,
      erro: 'nao-configurado',
      mensagem: 'O diagnóstico com IA ainda não está ligado neste servidor.'
    }), { 'Content-Type': 'application/json; charset=utf-8' });
  }

  const ip = ipDoPedido(req);
  if (!dentroDoLimite(ip)) {
    return enviar(res, 429, JSON.stringify({
      ok: false,
      erro: 'limite',
      mensagem: 'Você já gerou vários diagnósticos agora há pouco. Tente de novo mais tarde ou fale com a gente no WhatsApp.'
    }), { 'Content-Type': 'application/json; charset=utf-8' });
  }

  let bruto;
  try {
    bruto = await lerCorpo(req);
  } catch (e) {
    const grande = e.message === 'corpo grande demais';
    return enviar(res, grande ? 413 : 400, JSON.stringify({
      ok: false,
      erro: grande ? 'corpo-grande' : 'corpo-invalido',
      mensagem: grande ? 'Descreva a empresa em menos texto.' : 'Não entendemos os dados enviados.'
    }), { 'Content-Type': 'application/json; charset=utf-8' });
  }

  const dados = {
    empresa:     limpar(bruto.empresa, 160),
    segmento:    limpar(bruto.segmento, 80),
    atividade:   limpar(bruto.atividade, 600),
    porte:       limpar(bruto.porte, 40),
    estado:      limpar(bruto.estado, 40),
    experiencia: limpar(bruto.experiencia, 80),
    faturamento: limpar(bruto.faturamento, 60)
  };

  if (!dados.empresa || !dados.atividade || !dados.segmento) {
    return enviar(res, 400, JSON.stringify({
      ok: false, erro: 'campos', mensagem: 'Faltam dados da empresa.'
    }), { 'Content-Type': 'application/json; charset=utf-8' });
  }

  try {
    registrarUso(ip);
    const relatorio = await gerarRelatorio(dados);
    return enviar(res, 200, JSON.stringify({ ok: true, relatorio }),
      { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  } catch (e) {
    console.error('[relatorio] falhou:', e.message);
    return enviar(res, 502, JSON.stringify({
      ok: false,
      erro: 'geracao',
      mensagem: 'Não conseguimos gerar o diagnóstico agora. Tente de novo em alguns minutos.'
    }), { 'Content-Type': 'application/json; charset=utf-8' });
  }
}

/* =========================================================================
   CONTAS — cadastro, login e perfil
   -------------------------------------------------------------------------
   Quem cuida de senha, e-mail e recuperação é o Supabase Auth. Este servidor
   só conversa com ele e guarda a sessão num cookie httpOnly, que o JavaScript
   da página não consegue ler.
   ========================================================================= */

const SB_URL  = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_ANON = process.env.SUPABASE_ANON_KEY || '';
const COOKIE  = 'osc_sessao';
const SEGURO  = String(process.env.COOKIE_SEGURO || '1') !== '0';

function contasLigadas() { return Boolean(SB_URL && SB_ANON); }

function json(res, status, corpo, extras) {
  enviar(res, status, JSON.stringify(corpo), Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  }, extras || {}));
}

function lerCookies(req) {
  const cru = req.headers.cookie || '';
  const fora = {};
  cru.split(';').forEach((parte) => {
    const i = parte.indexOf('=');
    if (i < 0) return;
    fora[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim());
  });
  return fora;
}

function cookieSessao(valor, segundos) {
  const pedacos = [
    COOKIE + '=' + encodeURIComponent(valor),
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=' + segundos
  ];
  if (SEGURO) pedacos.push('Secure');
  return pedacos.join('; ');
}

function guardaSessao(dados) {
  return Buffer.from(JSON.stringify({
    a: dados.access_token,
    r: dados.refresh_token,
    exp: Math.floor(Date.now() / 1000) + (Number(dados.expires_in) || 3600)
  })).toString('base64url');
}

function abreSessao(req) {
  const c = lerCookies(req)[COOKIE];
  if (!c) return null;
  try { return JSON.parse(Buffer.from(c, 'base64url').toString('utf8')); }
  catch (e) { return null; }
}

/* Chamada ao Supabase, com a chave anon sempre no cabeçalho. */
async function sb(caminho, opcoes) {
  const o = opcoes || {};
  const cabecalhos = Object.assign({
    'apikey': SB_ANON,
    'Content-Type': 'application/json'
  }, o.headers || {});
  if (o.token) cabecalhos['Authorization'] = 'Bearer ' + o.token;

  const controle = new AbortController();
  const corta = setTimeout(() => controle.abort(), 20000);
  try {
    const r = await fetch(SB_URL + caminho, {
      method: o.method || 'GET',
      headers: cabecalhos,
      body: o.body ? JSON.stringify(o.body) : undefined,
      signal: controle.signal
    });
    const texto = await r.text();
    let corpo = null;
    try { corpo = texto ? JSON.parse(texto) : null; } catch (e) { corpo = texto; }
    return { ok: r.ok, status: r.status, corpo };
  } finally {
    clearTimeout(corta);
  }
}

/* Devolve um access_token válido, renovando quando faltar pouco. */
async function tokenValido(req, res) {
  const ses = abreSessao(req);
  if (!ses || !ses.a) return null;
  if (ses.exp - 60 > Math.floor(Date.now() / 1000)) return ses.a;

  if (!ses.r) return null;
  const r = await sb('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST', body: { refresh_token: ses.r }
  });
  if (!r.ok || !r.corpo || !r.corpo.access_token) return null;
  res.setHeader('Set-Cookie', cookieSessao(guardaSessao(r.corpo), 60 * 60 * 24 * 30));
  return r.corpo.access_token;
}

const textoLimpo = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());

/* Mensagens de erro do Supabase traduzidas. Nunca devolvemos o texto cru:
   ele às vezes conta demais sobre o que existe na base. */
function erroAmigavel(status, corpo) {
  const msg = String((corpo && (corpo.msg || corpo.error_description || corpo.message)) || '').toLowerCase();
  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return 'Esse e-mail já tem conta. Tente entrar.';
  }
  if (msg.includes('invalid login')) return 'E-mail ou senha não conferem.';
  if (msg.includes('email not confirmed')) return 'Confirme o e-mail antes de entrar. Veja a caixa de entrada.';
  if (msg.includes('password') && msg.includes('6')) return 'A senha precisa de pelo menos 6 caracteres.';
  if (status === 429) return 'Muitas tentativas seguidas. Espere um pouco.';
  return 'Não foi possível concluir. Tente de novo em alguns minutos.';
}

/* ---- POST /api/conta/cadastro ---- */
async function rotaCadastro(req, res) {
  let b;
  try { b = await lerCorpo(req, 64 * 1024); }
  catch (e) { return json(res, 400, { ok: false, mensagem: 'Dados inválidos.' }); }

  const nome  = textoLimpo(b.nome, 120);
  const email = textoLimpo(b.email, 160).toLowerCase();
  const senha = String(b.senha || '');

  if (nome.length < 2)     return json(res, 400, { ok: false, campo: 'nome',  mensagem: 'Diga seu nome.' });
  if (!emailValido(email)) return json(res, 400, { ok: false, campo: 'email', mensagem: 'E-mail inválido.' });
  if (senha.length < 8)    return json(res, 400, { ok: false, campo: 'senha', mensagem: 'A senha precisa de pelo menos 8 caracteres.' });

  const cadastro = await sb('/auth/v1/signup', {
    method: 'POST',
    body: { email, password: senha, data: { nome } }
  });

  if (!cadastro.ok) {
    return json(res, 400, { ok: false, mensagem: erroAmigavel(cadastro.status, cadastro.corpo) });
  }

  const dados = cadastro.corpo || {};
  const sessao = dados.access_token ? dados : (dados.session || null);
  const usuario = dados.user || (sessao && sessao.user) || null;

  // Supabase com confirmação de e-mail ligada: a conta existe, a sessão não.
  if (!sessao || !sessao.access_token) {
    return json(res, 200, {
      ok: true,
      precisaConfirmar: true,
      mensagem: 'Conta criada. Confirme o e-mail que enviamos para entrar.'
    });
  }

  const perfil = {
    id: usuario && usuario.id,
    nome,
    empresa:  textoLimpo(b.empresa, 160) || null,
    whatsapp: textoLimpo(b.whatsapp, 32) || null,
    segmento: textoLimpo(b.segmento, 80) || null,
    aceita_novidades: Boolean(b.novidades)
  };
  await sb('/rest/v1/perfis', {
    method: 'POST',
    token: sessao.access_token,
    headers: { 'Prefer': 'return=minimal' },
    body: perfil
  });

  res.setHeader('Set-Cookie', cookieSessao(guardaSessao(sessao), 60 * 60 * 24 * 30));
  return json(res, 200, { ok: true, perfil: { nome: perfil.nome, empresa: perfil.empresa, avatar: null } });
}

/* ---- POST /api/conta/entrar ---- */
async function rotaEntrar(req, res) {
  let b;
  try { b = await lerCorpo(req, 16 * 1024); }
  catch (e) { return json(res, 400, { ok: false, mensagem: 'Dados inválidos.' }); }

  const email = textoLimpo(b.email, 160).toLowerCase();
  const senha = String(b.senha || '');
  if (!emailValido(email) || !senha) {
    return json(res, 400, { ok: false, mensagem: 'Preencha e-mail e senha.' });
  }

  const r = await sb('/auth/v1/token?grant_type=password', {
    method: 'POST', body: { email, password: senha }
  });
  if (!r.ok || !r.corpo || !r.corpo.access_token) {
    return json(res, 401, { ok: false, mensagem: erroAmigavel(r.status, r.corpo) });
  }

  res.setHeader('Set-Cookie', cookieSessao(guardaSessao(r.corpo), 60 * 60 * 24 * 30));
  const perfil = await buscaPerfil(r.corpo.access_token, r.corpo.user && r.corpo.user.id);
  return json(res, 200, { ok: true, perfil });
}

/* ---- POST /api/conta/sair ---- */
async function rotaSair(req, res) {
  const ses = abreSessao(req);
  if (ses && ses.a) { try { await sb('/auth/v1/logout', { method: 'POST', token: ses.a }); } catch (e) {} }
  res.setHeader('Set-Cookie', cookieSessao('', 0));
  return json(res, 200, { ok: true });
}

async function buscaPerfil(token, id) {
  if (!id) return null;
  const r = await sb('/rest/v1/perfis?id=eq.' + encodeURIComponent(id) + '&select=*', { token });
  if (!r.ok || !Array.isArray(r.corpo) || !r.corpo.length) return null;
  return r.corpo[0];
}

/* ---- GET /api/conta/eu ---- */
async function rotaEu(req, res) {
  const token = await tokenValido(req, res);
  if (!token) return json(res, 200, { ok: true, entrou: false });

  const u = await sb('/auth/v1/user', { token });
  if (!u.ok || !u.corpo || !u.corpo.id) {
    res.setHeader('Set-Cookie', cookieSessao('', 0));
    return json(res, 200, { ok: true, entrou: false });
  }
  const perfil = await buscaPerfil(token, u.corpo.id);
  return json(res, 200, { ok: true, entrou: true, email: u.corpo.email, perfil });
}

/* ---- POST /api/conta/perfil ---- */
async function rotaPerfil(req, res) {
  const token = await tokenValido(req, res);
  if (!token) return json(res, 401, { ok: false, mensagem: 'Entre na sua conta primeiro.' });

  let b;
  try { b = await lerCorpo(req, 400 * 1024); }   // cabe o avatar reduzido
  catch (e) {
    const grande = e.message === 'corpo grande demais';
    return json(res, grande ? 413 : 400, {
      ok: false,
      mensagem: grande ? 'A imagem ficou grande demais. Escolha outra.' : 'Dados inválidos.'
    });
  }

  const u = await sb('/auth/v1/user', { token });
  if (!u.ok || !u.corpo || !u.corpo.id) return json(res, 401, { ok: false, mensagem: 'Sessão expirada.' });

  const mudancas = {};
  if (b.nome     !== undefined) mudancas.nome     = textoLimpo(b.nome, 120);
  if (b.empresa  !== undefined) mudancas.empresa  = textoLimpo(b.empresa, 160) || null;
  if (b.whatsapp !== undefined) mudancas.whatsapp = textoLimpo(b.whatsapp, 32) || null;
  if (b.cnpj     !== undefined) mudancas.cnpj     = textoLimpo(b.cnpj, 24) || null;
  if (b.segmento !== undefined) mudancas.segmento = textoLimpo(b.segmento, 80) || null;
  if (b.cargo    !== undefined) mudancas.cargo    = textoLimpo(b.cargo, 80) || null;
  if (b.novidades !== undefined) mudancas.aceita_novidades = Boolean(b.novidades);

  if (b.avatar !== undefined) {
    if (b.avatar === null || b.avatar === '') {
      mudancas.avatar = null;
    } else {
      const v = String(b.avatar);
      // só aceitamos imagem embutida, nunca um endereço externo
      if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) {
        return json(res, 400, { ok: false, mensagem: 'Formato de imagem não aceito.' });
      }
      if (v.length > 300000) return json(res, 413, { ok: false, mensagem: 'A imagem ficou grande demais.' });
      mudancas.avatar = v;
    }
  }

  if (mudancas.nome !== undefined && mudancas.nome.length < 2) {
    return json(res, 400, { ok: false, campo: 'nome', mensagem: 'Diga seu nome.' });
  }
  if (!Object.keys(mudancas).length) return json(res, 400, { ok: false, mensagem: 'Nada para salvar.' });

  const r = await sb('/rest/v1/perfis?id=eq.' + encodeURIComponent(u.corpo.id), {
    method: 'PATCH',
    token,
    headers: { 'Prefer': 'return=representation' },
    body: mudancas
  });

  if (!r.ok) {
    console.error('[conta] perfil não salvou:', r.status, JSON.stringify(r.corpo).slice(0, 300));
    return json(res, 502, { ok: false, mensagem: 'Não conseguimos salvar agora. Tente de novo.' });
  }
  return json(res, 200, { ok: true, perfil: Array.isArray(r.corpo) ? r.corpo[0] : null });
}

const ROTAS_CONTA = {
  '/api/conta/cadastro': rotaCadastro,
  '/api/conta/entrar':   rotaEntrar,
  '/api/conta/sair':     rotaSair,
  '/api/conta/perfil':   rotaPerfil
};

const servidor = http.createServer((req, res) => {
  const caminhoApi = (req.url || '').split('?')[0];

  if (req.method === 'POST' && caminhoApi === '/api/relatorio') {
    return rotaRelatorio(req, res);
  }

  if (caminhoApi.indexOf('/api/conta/') === 0) {
    if (!contasLigadas()) {
      return json(res, 503, {
        ok: false, erro: 'nao-configurado',
        mensagem: 'O cadastro ainda não está ligado neste servidor.'
      });
    }
    if (req.method === 'GET' && caminhoApi === '/api/conta/eu') return rotaEu(req, res);
    const rota = ROTAS_CONTA[caminhoApi];
    if (rota && req.method === 'POST') {
      return rota(req, res).catch((e) => {
        console.error('[conta] falhou:', e.message);
        json(res, 500, { ok: false, mensagem: 'Erro inesperado. Tente de novo.' });
      });
    }
    return json(res, 405, { ok: false, mensagem: 'Método não permitido.' });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return enviar(res, 405, 'Método não permitido', { 'Content-Type': 'text/plain; charset=utf-8', 'Allow': 'GET, HEAD' });
  }

  let caminho;
  try {
    caminho = decodeURIComponent(url.parse(req.url).pathname || '/');
  } catch (e) {
    return enviar(res, 400, 'Endereço inválido', { 'Content-Type': 'text/plain; charset=utf-8' });
  }

  if (caminho.endsWith('/')) caminho += 'index.html';

  // Resolve dentro da raiz e recusa qualquer tentativa de sair dela (../)
  const destino = path.resolve(RAIZ, '.' + path.sep + caminho);
  const relativo = path.relative(RAIZ, destino);

  if (relativo.startsWith('..') || path.isAbsolute(relativo) || ehBloqueado(relativo)) {
    return enviar(res, 403, 'Acesso negado', { 'Content-Type': 'text/plain; charset=utf-8' });
  }

  fs.stat(destino, (erro, info) => {
    if (erro || !info.isFile()) {
      // Sem página de erro própria: devolve o próprio site
      return fs.readFile(path.join(RAIZ, 'index.html'), (e2, html) => {
        if (e2) return enviar(res, 404, 'Não encontrado', { 'Content-Type': 'text/plain; charset=utf-8' });
        enviar(res, 404, html, { 'Content-Type': TIPOS['.html'] });
      });
    }

    const ext  = path.extname(destino).toLowerCase();
    const tipo = TIPOS[ext] || 'application/octet-stream';

    // HTML sempre fresco; o resto pode ficar em cache
    const cache = ext === '.html'
      ? 'no-cache'
      : 'public, max-age=86400';

    res.writeHead(200, {
      'Content-Type': tipo,
      'Content-Length': info.size,
      'Cache-Control': cache,
      'X-Content-Type-Options': 'nosniff'
    });

    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(destino).pipe(res);
  });
});

servidor.listen(PORTA, HOST, () => {
  console.log('OSC no ar em http://' + HOST + ':' + PORTA);
});
