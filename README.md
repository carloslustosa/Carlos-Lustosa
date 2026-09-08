# OSC — Gestão Empresarial e Licitações

Landing page (one page) de captação de leads da **OSC Gestão Empresarial e Licitações**.

> **Estrutura hoje, crescimento amanhã.**

---

## Stack

| Camada | Tecnologia |
|---|---|
| Marcação | HTML5 semântico |
| Estilo | Tailwind CSS (Play CDN) + `assets/css/styles.css` |
| Animação | GSAP 3.12 + ScrollTrigger (CDN) e CSS/IntersectionObserver |
| Tipografia | Archivo (400/600/900) + IBM Plex Mono (Google Fonts) |

Não há build step. Basta abrir o `index.html` — ou publicar a pasta inteira em
qualquer hospedagem estática (GitHub Pages, Vercel, Netlify, Hostinger, S3).

```bash
# visualizar localmente
python3 -m http.server 8000
# depois: http://localhost:8000
```

---

## Estrutura de arquivos

```
.
├── index.html              # página completa (todas as seções)
├── assets/
│   ├── css/styles.css      # identidade visual e componentes de marca
│   ├── js/main.js          # navegação, reveal, contadores, acordeões, form
│   └── img/
│       ├── favicon.svg     # ícone da aba
│       └── og-cover.svg    # imagem de compartilhamento
└── README.md
```

---

## Identidade visual

| Token | Hex | Uso |
|---|---|---|
| Verde Profundo | `#0A2615` | fundo institucional principal |
| Verde Profundo + | `#061A0E` | faixas e blocos de contraste |
| Creme Documento | `#F4F1E1` | fundos de respiro e texto sobre escuro |
| Verde Crescimento | `#7CB342` | CTAs, destaques e barras da marca |
| Verde Crescimento escuro | `#4E7A28` | mesmo destaque sobre fundo creme (contraste) |

**Elemento gráfico da marca:** três barras verticais crescentes na proporção
**1 : 1.6 : 2.7**, sempre alinhadas pela base. Está implementado como componente
reutilizável em CSS (`.bars`, com as variáveis `--ratio-1/2/3`) e aparece em
seis lugares: rótulos, marcadores da lista de solução, cards de serviço,
gráfico da metodologia, hero e rodapé.

Design **flat**: sem sombras difusas. A profundidade vem de cor, borda de 2px
e movimento.

---

## Animações

| Onde | O que acontece |
|---|---|
| Hero | entrada sequencial do conteúdo + as 3 barras gigantes subindo (CSS) |
| Rolagem | todo elemento com `data-reveal` surge de baixo para cima |
| Faixa de números | contagem animada ao entrar na tela |
| Metodologia | as 3 barras do gráfico sobem **uma a uma** quando a seção aparece |
| Degraus | clique/hover abre a etapa e destaca a coluna correspondente do gráfico |
| Cards de serviço | preenchimento verde profundo subindo + barras da marca crescendo |
| Setores | faixa em loop contínuo (pausa no hover) |
| Botões | varredura de cor + seta deslizando; CTA do hero com pulso |

Tudo respeita `prefers-reduced-motion`. Se o CDN do GSAP falhar, a página
continua funcionando: reveal, acordeões e barras têm fallback em
IntersectionObserver + CSS.

---

## ⚠️ O que você precisa editar antes de publicar

Procure por `EDITAR` no código. Os pontos são:

1. **Número de WhatsApp** — aparece em 4 lugares:
   - `assets/js/main.js` → constante `WHATSAPP_NUMBER` (formato `55DDNNNNNNNNN`)
   - `index.html` → link da seção de contato, link do rodapé e botão flutuante
2. **Números da faixa de autoridade** (`index.html`, atributos `data-count`) —
   hoje estão com valores de exemplo: `+120` empresas, `+850` editais, `98%`,
   `24h`. **Substitua pelos números reais da OSC** antes de ir ao ar.
3. **CNPJ** no rodapé.
4. **URL canônica** (`<link rel="canonical">`) e `og:image` quando o domínio estiver definido.
5. **Imagem de compartilhamento** — o `og-cover.svg` serve de referência visual,
   mas a maioria das redes sociais só lê PNG/JPG. Exporte-o como
   `og-cover.png` (1200×630) e atualize a meta tag `og:image`.

O e-mail `contato.osc.gestao@gmail.com` já está aplicado na seção de contato e no rodapé.

---

## Formulário

O formulário valida os campos obrigatórios no navegador e abre o WhatsApp com a
mensagem já montada (nome, empresa, telefone, e-mail, segmento e necessidade).
Não há backend — se você quiser gravar os leads, troque o `window.open(...)` em
`initForm()` por um `fetch` para o seu endpoint (Formspree, n8n, RD Station,
Google Apps Script etc.).
