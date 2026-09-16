# OSC — Gestão Empresarial e Licitações

Landing page (one page) de captação de leads da **OSC Gestão Empresarial e Licitações**,
construída sobre o Manual de Identidade Visual **V2.0**.

> **Estrutura hoje, crescimento amanhã.**

---

## Stack

| Camada | Tecnologia |
|---|---|
| Marcação | HTML5 semântico |
| Estilo | Tailwind CSS (Play CDN) + `assets/css/styles.css` |
| Animação | GSAP 3.12 + ScrollTrigger (CDN) e CSS/IntersectionObserver |
| Tipografia | Archivo (400/500/600/800/900) + IBM Plex Mono (400/500) |

Não há build step. Duas formas de usar, com o **mesmo resultado**:

- **`osc-landing-page.html`** — arquivo único, com CSS e JS embutidos e o favicon
  em data URI. Abre com duplo clique e sobe sozinho em qualquer lugar.
- **`index.html` + `assets/`** — versão separada, melhor para manter o código.

```bash
python3 -m http.server 8000   # depois: http://localhost:8000
```

> Ao editar, mexa numa das duas versões e regenere a outra — elas não se
> sincronizam sozinhas.

---

## Identidade visual V2.0

### Paleta oficial

| Token | Hex | Papel no manual | Proporção |
|---|---|---|---|
| Verde profundo | `#12301F` | anel O, fundo institucional | 55 % |
| Creme documento | `#F2EFE4` | papel e fundo de leitura | 27 % |
| Verde médio | `#3F8A4B` | anel C, filetes e apoio | 10 % |
| Verde crescimento | `#87D06A` | ponto de encontro e destaques | 8 % |

Auxiliares: `#0F1F14` (faixas de contraste), `#E3DFD0` e `#CFD3C5` (creme sombreado
e filete sobre creme), `#2F6A3A` (verde médio escurecido, só para texto sobre creme
ter contraste de leitura) e `#AC312A` (alerta, exclusivo da validação do formulário).

### Monograma

O logo é o monograma de anéis, construído em SVG conforme o manual:

- anel **O** fechado — espessura de **1/6 do diâmetro**;
- anel **C** interrompido — **8 % menor**, abertura no **quadrante superior direito**,
  deslocado na **diagonal ascendente**;
- o **ponto** marca exatamente onde os dois anéis se cruzam (a parceria).

Três aplicações: `.mono--positiva` (sobre creme), `.mono--negativa` (sobre verde
profundo) e `.mono--mono` (monocromática, herda `currentColor`).

O favicon segue a regra de avatar: **só o símbolo, a 62 % do quadrado, centralizado** —
nunca a sigla dentro, que desaparece em 32 px.

### Ornamento

O anel aberto e o ponto são os **únicos** ornamentos da marca. Aparecem como:
classe `.ring` (marcadores, rótulos, cards, menu), padrão de fundo `.pattern`
repetido em fileira a **12 % de opacidade**, e o monograma gigante sangrando pela
borda do hero.

### Tipografia

- Título · Archivo 900, `-0.035em`
- Subtítulo · Archivo 600, `-0.02em`
- Corpo · Archivo 400, entrelinha 1.6, mínimo 15 px
- Descritor · IBM Plex Mono, `0.28em`, caixa alta
- Rótulo · IBM Plex Mono, `0.18em`, caixa alta

**Caixa alta só em rótulo e descritor.** O manual lista "caixa alta em frases inteiras"
entre as coisas a evitar — por isso nenhum título da página está em maiúsculas.

### O que o manual proíbe (e o código respeita)

Sem sombra, sem contorno adicional, sem gradiente e sem distorção de proporção.
Nenhuma cor fora da paleta oficial.

---

## Animações

| Onde | O que acontece |
|---|---|
| Hero | entrada sequencial do conteúdo + monograma gigante com parallax |
| Rolagem | todo elemento com `data-reveal` surge de baixo para cima |
| Metodologia | o anel de progresso fecha 33 % → 66 % → 100 % conforme a etapa |
| Etapas | clique/hover abre a etapa, gira o indicador e move o anel |
| Cards | preenchimento verde profundo subindo + o anel girando |
| Setores | faixa em loop contínuo (pausa no hover) |
| Botões | varredura de cor + o ponto da marca deslizando; CTA principal com pulso |

Tudo respeita `prefers-reduced-motion`. Se o CDN do GSAP falhar, a página continua
funcionando: reveal, acordeões e o anel têm fallback em IntersectionObserver + CSS.

---

## WhatsApp

O número oficial é **(86) 98837-2619**. O link muda conforme o dispositivo:

| Dispositivo | Destino |
|---|---|
| Celular | `api.whatsapp.com/send?phone=5586988372619&text=Oi! Quero saber mais informações sobre a OSC.` |
| Computador | `web.whatsapp.com/send?phone=5586988372619&text=Oi! Quero mais informações sobre a OSC.` |

No HTML o `href` padrão de todo link `.js-whats` é o **api.whatsapp.com** (funciona em
qualquer lugar, inclusive sem JavaScript). O `initWhatsappLinks()` troca para o
WhatsApp Web só quando detecta computador. O formulário usa a mesma regra, com a
mensagem montada a partir dos campos.

Para trocar o número depois, edite o objeto `WHATS` no JS e os quatro `href` no HTML.

---

## Contato aplicado na página

- **E-mail:** contato.osc.gestao@gmail.com
- **WhatsApp:** (86) 98837-2619
- **Redes sociais:** @osc.gestao

---

## ⚠️ O que ainda precisa da sua conferência

1. **URLs das redes sociais.** Você informou o handle `osc.gestao`, não os endereços.
   O código monta Instagram, LinkedIn e TikTok a partir dele
   (`instagram.com/osc.gestao`, `linkedin.com/company/osc.gestao`,
   `tiktok.com/@osc.gestao`). **Confirme os perfis que existem e apague os que não
   usar** — estão marcados com `EDITAR` no rodapé.
2. **URL canônica** (`<link rel="canonical">`) e `og:image` quando o domínio existir.
3. **Imagem de compartilhamento.** O `og-cover.svg` serve de referência, mas as redes
   sociais só leem PNG/JPG. Exporte como `og-cover.png` (1200×630).

---

## Formulário

Valida os campos obrigatórios no navegador e abre o WhatsApp com a mensagem pronta
(nome, empresa, telefone, e-mail, segmento e necessidade). Não há backend — se quiser
gravar os leads, troque o `window.open(...)` em `initForm()` por um `fetch` para o seu
endpoint (Formspree, n8n, RD Station, Google Apps Script etc.).
