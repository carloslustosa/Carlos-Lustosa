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

const servidor = http.createServer((req, res) => {
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
