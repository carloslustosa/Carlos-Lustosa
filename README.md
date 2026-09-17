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

Edite sempre o `index.html` + `assets/` e regenere o arquivo único:

```bash
python3 build.py              # gera osc-landing-page.html
```

### Arquivos

```
.
├── index.html              # página (fonte de verdade)
├── build.py                # gera a versão de arquivo único
├── osc-landing-page.html   # versão de arquivo único (gerada)
├── package.json            # metadados e scripts npm
├── server.js               # servidor estático, sem dependências
├── database/
│   └── schema.sql          # banco de dados dos leads
└── assets/
    ├── css/styles.css      # identidade visual e componentes
    ├── js/background.js    # fundo interativo em canvas
    ├── js/main.js          # navegação, reveal, formulário, banco
    └── img/                # favicon e capa de compartilhamento
```

### Scripts npm

| Comando | O que faz |
|---|---|
| `npm start` | sobe o site em `http://localhost:3000` (é o que a Hostinger executa) |
| `npm run dev` | o mesmo, para desenvolver |
| `npm run build` | não faz nada — o site é estático, não há o que compilar |
| `npm run build:single` | regenera o `osc-landing-page.html` (precisa de Python 3) |

Não há dependências: `npm install` não baixa nada e o `server.js` usa só o que
já vem no Node.

---

## Publicar na Hostinger

O site é **HTML estático**. Há dois caminhos, e vale saber em qual você está.

### 1. Hospedagem comum (o caminho normal)

Envie os arquivos para a pasta `public_html` pelo Gerenciador de Arquivos ou por
FTP. Precisa de: `index.html`, a pasta `assets/` e nada mais.

Neste caminho o `package.json` e o `server.js` **não são usados** — o servidor da
Hostinger entrega o `index.html` sozinho. Eles não atrapalham; ficam parados.

Ainda mais simples: envie só o `osc-landing-page.html`, renomeie para
`index.html` e pronto. Um arquivo, site no ar.

### 2. Aplicação Node.js ou importação de repositório

Alguns fluxos da Hostinger (Node.js app, deploy pelo Git, importação de projeto)
exigem o `package.json` para reconhecer o projeto. É para isso que ele existe
aqui. A plataforma vai rodar:

```
npm install     # não baixa nada, não há dependências
npm start       # sobe o server.js na porta que a Hostinger definir
```

O `server.js` lê a variável `PORT` do ambiente — que a Hostinger define — e cai
em 3000 se ela não existir. Ele também recusa servir `database/`, `server.js`,
`package.json`, `build.py` e qualquer arquivo começado com ponto, e bloqueia
tentativas de sair da pasta do site.

### Depois de publicar

Confira se o `assets/` subiu inteiro: sem ele a página aparece sem estilo e sem
o fundo interativo.

---

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

## Fundo interativo

O fundo é **cor sólida** (`#12301F`). Em cima dele, um `<canvas>` fixo desenha um
campo de monogramas da marca — os mesmos anéis do logo, na mesma proporção.

| Interação | O que acontece |
|---|---|
| Mouse | os anéis próximos ao cursor acendem, giram mais rápido e se afastam de leve |
| Clique ou toque | dispara uma onda que empurra os anéis por perto |
| Arrastar o dedo | o dedo funciona como cursor |
| Inclinar o aparelho | o campo se desloca com o giroscópio (onde o navegador permite) |

As seções escuras são transparentes, então o campo aparece através delas; as
seções creme são sólidas e cobrem o canvas. O canvas tem `pointer-events: none`,
ou seja, nunca rouba um clique do conteúdo.

**Cuidados de desempenho:** a quantidade de anéis é proporcional à área da tela
(5 a 16), o `devicePixelRatio` é limitado a 2, o loop pausa quando a aba sai de
foco e é desligado por completo em `prefers-reduced-motion` — aí o campo é
desenhado uma vez e fica parado.

Para mexer no fundo: `assets/js/background.js`. Os pontos de ajuste são
`ringCount()` (quantidade) e o campo `alpha` em `build()` (intensidade).

---

## Adaptação por dispositivo

Testado em 8 tamanhos, de 320 px a 1920 px, sem rolagem horizontal em nenhum.

| Faixa | O que muda |
|---|---|
| Até 400 px | logo, botões e cantos reduzidos |
| Até 1023 px | menu hambúrguer, alvos de toque com no mínimo 40 px, espaço extra no fim do formulário para o botão do WhatsApp não tapar nada |
| Celular deitado | hero perde a altura mínima e o menu vira rolável |
| 640–1023 px (tablet) | o anel da metodologia fica ao lado do texto, em vez de embaixo |
| A partir de 1024 px | menu em links, layout em duas colunas |
| A partir de 1536 px | respiro vertical maior |
| Sem hover (toque) | os cards já nascem no estado final, em vez de depender de um hover que nunca acontece |

Há ainda uma folha de impressão que esconde fundo, menu e botão flutuante.

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

## Banco de dados dos leads

Todo mundo que preenche o formulário é gravado numa tabela `leads`, e em seguida
o WhatsApp abre com a mensagem pronta. As duas coisas acontecem juntas: se a
gravação falhar, o contato **não se perde** — o WhatsApp abre do mesmo jeito.

O banco é **Supabase** (Postgres gerenciado, plano gratuito, painel pronto para
consultar e editar os leads). Ele foi escolhido porque o site é estático: não há
servidor para rodar código, então o formulário precisa falar direto com uma API.

### Ligar o banco (5 minutos)

1. Crie um projeto em <https://supabase.com>.
2. Abra o **SQL Editor**, cole o `database/schema.sql` inteiro e execute.
3. Vá em **Settings → API** e copie a *Project URL* e a chave *anon public*.
4. Preencha as duas no objeto `DB`, no início do JavaScript:

```js
var DB = {
  url:     'https://xxxxxxxx.supabase.co',
  anonKey: 'sua-chave-anon',
  table:   'leads'
};
```

5. Regenere o arquivo único (`python3 build.py`) e publique.

Os leads aparecem em **Table Editor → leads**. Há duas visões prontas:
`leads_novos` (quem ainda não foi contatado) e `leads_por_dia` (quantos entram
por dia e quantos viraram cliente).

### Enquanto você não ligar

O formulário continua funcionando normalmente e manda tudo para o WhatsApp.
Ele só não grava.

### O que é gravado

Nome, empresa, WhatsApp, e-mail, segmento e mensagem, mais a origem do lead:
página, referrer, `utm_source`, `utm_medium`, `utm_campaign` e navegador. Assim
dá para saber qual anúncio ou post trouxe cada cliente.

O acompanhamento comercial (`status`, `responsavel`, `observacoes`,
`contatado_em`) fica só no painel — o site nunca escreve nesses campos.

### Segurança

A chave *anon* fica visível no código do site, e **isso é o esperado**: sozinha
ela não abre nada. Quem protege os dados é a Row Level Security do schema, que
libera **apenas a inserção**. Ninguém consegue ler, alterar ou apagar leads pelo
site — só você, logado no painel.

**Nunca coloque a chave `service_role` no site.** Ela ignora a RLS.

O formulário ainda tem um campo-armadilha invisível contra robôs e um índice
único que barra o mesmo e-mail enviado duas vezes no mesmo minuto.

### Se quiser outro destino

Trocar Supabase por Formspree, n8n, RD Station ou uma planilha é mudar uma
função só: `salvarLead()`, em `assets/js/main.js`.

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
