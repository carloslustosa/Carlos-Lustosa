#!/usr/bin/env python3
"""
Gera osc-landing-page.html: a versão de arquivo único do site.

Pega o index.html e embute dentro dele o CSS, os dois arquivos de JavaScript e
o favicon (como data URI). Os CDNs de Tailwind, GSAP e Google Fonts continuam
externos — precisam de internet, mas não de arquivos ao lado.

Uso:  python3 build.py
"""
import re
import urllib.parse

ENTRADA = 'index.html'
SAIDA   = 'osc-landing-page.html'


def embutir():
    html = open(ENTRADA, encoding='utf-8').read()
    css  = open('assets/css/styles.css', encoding='utf-8').read()
    fav  = open('assets/img/favicon.svg', encoding='utf-8').read()

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

        ('<link rel="stylesheet" href="assets/css/styles.css" />',
         '<style>\n' + css.rstrip() + '\n</style>'),
    ]

    # os dois scripts, na mesma ordem em que aparecem no HTML
    for arquivo in ('background.js', 'main.js'):
        js = open('assets/js/' + arquivo, encoding='utf-8').read()
        trocas.append(('<script src="assets/js/%s"></script>' % arquivo,
                       '<script>\n' + js.rstrip() + '\n</script>'))

    for velho, novo in trocas:
        if html.count(velho) != 1:
            raise SystemExit('Esperava exatamente 1 ocorrência de: %s' % velho[:70])
        html = html.replace(velho, novo)

    if 'assets/' in html:
        raise SystemExit('Sobrou referência a assets/ no arquivo gerado.')

    open(SAIDA, 'w', encoding='utf-8').write(html)
    print('%s gerado — %d KB' % (SAIDA, len(html.encode('utf-8')) // 1024))


if __name__ == '__main__':
    embutir()
