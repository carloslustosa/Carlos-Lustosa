#!/usr/bin/env python3
"""
Gera as versões de arquivo único do site (home e guia).

Pega cada página e embute nela o CSS, os dois arquivos de JavaScript e o
favicon (como data URI). Os CDNs de Tailwind, GSAP e Google Fonts continuam
externos — precisam de internet, mas não de arquivos ao lado.

Uso:  python3 build.py
"""
import base64
import os
import re
import urllib.parse

# (arquivo de origem, arquivo gerado)
PAGINAS = [
    ('index.html',           'osc-landing-page.html'),
    ('guia-licitacoes.html', 'osc-guia-licitacoes.html'),
    ('setores.html',         'osc-setores.html'),
]

# entrar.html e conta.html dependem do servidor (/api/conta), então não têm
# versão de arquivo único: sem servidor elas não funcionariam de qualquer jeito.

# Nas versões de arquivo único os links entre as páginas mudam de nome
LINKS = {
    'index.html':           'osc-landing-page.html',
    'guia-licitacoes.html': 'osc-guia-licitacoes.html',
    'setores.html':         'osc-setores.html',
}


def embutir(entrada, saida):
    html = open(entrada, encoding='utf-8').read()
    fav  = open('assets/img/favicon.svg', encoding='utf-8').read()

    # As fontes viram data URI para o arquivo único funcionar sozinho mesmo
    # aberto do disco, sem pasta ao lado e sem internet.
    fontes = open('assets/css/fontes.css', encoding='utf-8').read()
    for nome in sorted(os.listdir('assets/fonts')):
        if not nome.endswith('.woff2'):
            continue
        dados = base64.b64encode(open('assets/fonts/' + nome, 'rb').read()).decode('ascii')
        fontes = fontes.replace("url('../fonts/%s')" % nome,
                                "url('data:font/woff2;base64,%s')" % dados)

    css = (fontes
           + '\n\n' + open('assets/css/tailwind.css', encoding='utf-8').read()
           + '\n\n' + open('assets/css/styles.css', encoding='utf-8').read()
           + '\n\n' + open('assets/css/componentes.css', encoding='utf-8').read())

    # favicon -> data URI
    fav_min = re.sub(r'<!--.*?-->', '', fav, flags=re.S)
    fav_min = re.sub(r'\s+', ' ', fav_min).strip()
    fav_uri = 'data:image/svg+xml,' + urllib.parse.quote(fav_min, safe='')

    trocas = [
        ('<link rel="icon" type="image/svg+xml" href="assets/img/favicon.svg" />',
         '<link rel="icon" type="image/svg+xml" href="%s" />' % fav_uri),

        ('<meta property="og:image" content="assets/img/og-cover.svg" />',
         '<!-- EDITAR: suba uma imagem 1200x630 (PNG/JPG) e aponte a URL absoluta aqui -->\n'
         '<meta property="og:image" content="https://oscgestao.com.br/og-cover.png" />'),

        ('<link rel="stylesheet" href="assets/css/fontes.css" />\n'
         '<link rel="stylesheet" href="assets/css/tailwind.css" />\n'
         '<link rel="stylesheet" href="assets/css/styles.css" />\n'
         '<link rel="stylesheet" href="assets/css/componentes.css" />',
         '<style>\n' + css.rstrip() + '\n</style>'),
    ]

    # os scripts, na mesma ordem em que aparecem no HTML
    for arquivo in ('background.js', 'main.js', 'componentes.js', 'conta.js',
                    'relatorio.js', 'consultor.js'):
        js = open('assets/js/' + arquivo, encoding='utf-8').read()
        trocas.append(('<script src="assets/js/%s" defer></script>' % arquivo,
                       '<script>\n' + js.rstrip() + '\n</script>'))

    # sem arquivo de fonte ao lado, o preload apontaria para o nada
    html = re.sub(r'<link rel="preload" href="assets/fonts/[^>]*/>\n', '', html)

    for velho, novo in trocas:
        ocorrencias = html.count(velho)
        # relatorio.js e consultor.js só existem na home; o guia não os carrega
        if ocorrencias == 0 and ('relatorio.js' in velho or 'consultor.js' in velho):
            continue
        if ocorrencias != 1:
            raise SystemExit('Esperava exatamente 1 ocorrência de: %s' % velho[:70])
        html = html.replace(velho, novo)

    if 'assets/' in html:
        raise SystemExit('Sobrou referência a assets/ no arquivo gerado.')

    # aponta os links entre páginas para os nomes da versão de arquivo único
    for origem, destino in LINKS.items():
        html = html.replace('href="%s"' % origem, 'href="%s"' % destino)
        html = html.replace('href="%s#' % origem, 'href="%s#' % destino)

    open(saida, 'w', encoding='utf-8').write(html)
    print('%s gerado — %d KB' % (saida, len(html.encode('utf-8')) // 1024))


if __name__ == '__main__':
    for entrada, saida in PAGINAS:
        embutir(entrada, saida)
