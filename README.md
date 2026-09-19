# OSC — Gestão Empresarial e Licitações

Landing page (one page) de captação de leads da **OSC Gestão Empresarial e Licitações**,
construída sobre o Manual de Identidade Visual **V2.0**.

> **Estrutura hoje, crescimento amanhã.**

---

## Stack

| Camada | Tecnologia |
|---|---|
| Marcação | HTML5 semântico |
| Estilo | Tailwind **compilado** (`assets/css/tailwind.css`) + CSS próprio |
| Animação | CSS e IntersectionObserver, com GSAP opcional por CDN |
| Tipografia | Archivo e IBM Plex Mono **hospedadas no próprio site** |

### Por que o Tailwind é compilado, e não por CDN

O Play CDN do Tailwind é um **script**: ele só gera o CSS depois de carregar e
rodar. Até lá — e sempre, se o CDN falhar ou demorar — a página aparece sem
layout nenhum: menu de celular e de computador ao mesmo tempo, sem respiro, sem
largura máxima. Era exatamente esse o bug que o site tinha no topo.

Agora o CSS é um arquivo pronto de ~39 KB, e as fontes moram em `assets/fonts/`.
O site monta certo **sem depender de nada externo**. Só o GSAP continua vindo de
fora, e ele é enfeite: sem ele, tudo funciona igual.

> **Se você editar o HTML e usar uma classe nova do Tailwind**, rode
> `npm run build:css` para regenerar. O `tailwind.config.js` já tem uma lista de
> segurança com as classes mais comuns (espaçamento, cores da marca, colunas,
> tamanhos de texto), então a maioria das edições rápidas não precisa disso.

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
├── index.html                  # home (fonte de verdade)
├── guia-licitacoes.html        # guia de licitações públicas
├── setores.html                # nove setores atendidos, em detalhe
├── entrar.html                 # login e cadastro
├── conta.html                  # área do cliente
├── build.py                    # gera as versões de arquivo único
├── osc-landing-page.html       # home em arquivo único (gerada)
├── osc-guia-licitacoes.html    # guia em arquivo único (gerado)
├── osc-setores.html            # setores em arquivo único (gerado)
├── package.json                # metadados e scripts npm
├── server.js                   # servidor estático + API do diagnóstico
├── .htaccess                   # regras do servidor na hospedagem estática
├── .env.example                # variáveis do servidor (copie para .env)
├── database/
│   ├── schema.sql              # leads
│   └── 002-contas.sql          # contas e perfis
└── assets/
    ├── css/styles.css          # identidade visual
    ├── css/componentes.css     # avatar, botões, carrossel, upload
    ├── js/background.js        # fundo interativo em canvas
    ├── js/main.js              # navegação, reveal, formulário, leads
    ├── js/componentes.js       # comportamento dos componentes
    ├── js/conta.js             # cadastro, login e perfil
    ├── js/relatorio.js         # diagnóstico com IA
    └── img/                    # favicon e capa de compartilhamento
```

### Scripts npm

| Comando | O que faz |
|---|---|
| `npm start` | sobe o site em `http://localhost:3000` e liga `/api/relatorio` (é o que a Hostinger executa) |
| `npm run dev` | o mesmo, para desenvolver |
| `npm run build` | regenera o CSS e os arquivos únicos |
| `npm run build:css` | recompila o `assets/css/tailwind.css` |
| `npm run watch:css` | recompila sozinho enquanto você edita o HTML |
| `npm run build:single` | regenera as versões de arquivo único (precisa de Python 3) |

O `server.js` não tem dependência nenhuma — usa só o que vem no Node. O Tailwind
e as fontes estão em `devDependencies`: servem para **construir** o CSS, não para
servir o site. Em produção nada disso é carregado pelo navegador.

---

## Contas de cliente

`entrar.html` faz login e cadastro; `conta.html` é a área do cliente, com os
dados e o avatar. Criar conta é **opcional** — o site inteiro funciona sem.

### Como a sessão é guardada

Quem cuida de senha, e-mail e recuperação é o **Supabase Auth**. Nosso servidor
conversa com ele e devolve a sessão num **cookie httpOnly**: o JavaScript da
página não consegue ler o token, o que fecha a porta mais comum de roubo de
sessão. O cookie é `SameSite=Lax` e `Secure` em produção.

### Ligar

1. Rode `database/002-contas.sql` no SQL Editor do Supabase.
2. Preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY` no `.env`.
3. O site precisa rodar como **aplicação Node** — as rotas `/api/conta/*` vivem
   no `server.js`.

Sem isso configurado, as rotas respondem 503 com uma mensagem clara.

**Confirmação de e-mail:** se estiver ligada no painel do Supabase (é o padrão),
o cadastro cria a conta mas não abre a sessão — a página avisa para confirmar o
e-mail. Se preferir entrada imediata, desligue em Authentication → Providers.

### Avatar

A foto é reduzida a **256×256 no navegador** antes de subir, e vai como data URL
no campo `avatar` do perfil. Sobem poucos KB em vez do arquivo original, e não
precisamos de um serviço de arquivos. O servidor só aceita `data:image/...` —
endereço externo é recusado, para ninguém usar o campo como vetor de conteúdo
de terceiros. Sem foto, o avatar mostra as iniciais, com uma cor derivada do
nome (a mesma pessoa tem sempre a mesma cor).

Se a base de clientes crescer muito, o caminho é migrar para o Supabase Storage.

### Segurança

Cada pessoa só enxerga e edita o próprio perfil. A regra está na Row Level
Security do `002-contas.sql` e vale mesmo se alguém chamar a API direto, sem
passar pelo site.

---

## Adaptação a celular e tablet

O site é o mesmo em qualquer tela, com ajustes onde o aparelho pede:

| Faixa | O que muda |
|---|---|
| Até 359 px | o descritor sob o logo sai, para a marca não virar amontoado |
| Até 640 px | botões ocupam a linha inteira, cantos menores, dock de ações empilhado |
| **Até 1023 px** | **rótulo em mono sobe para 12,5 px** e **todo alvo de toque chega a 44 px**; menu vira hambúrguer; os 8 cards de serviço viram carrossel |
| Até 360 px | os controles do carrossel quebram em duas linhas em vez de vazar para fora da tela |
| Celular deitado | o hero perde a altura mínima e o menu vira rolável |
| 640–1023 px | o anel da metodologia fica ao lado do texto |
| A partir de 1024 px | menu em links com mega menu, grade de 4 colunas |
| Sem hover | os cards já nascem no estado final |

Decisões que valem registrar:

- **A faixa de tipografia vai até 1023 px, não 640.** Tablet e celular deitado
  são segurados na mão do mesmo jeito; o texto ali é tão pequeno quanto no
  telefone em pé.
- **Campo de formulário tem 16 px.** Abaixo disso o Safari do iPhone dá zoom
  sozinho quando a pessoa toca no campo, e a tela sai do lugar.
- **O marcador do carrossel continua com 8 px aos olhos**, mas tem 40 px de área
  invisível em volta, para o dedo acertar.
- **Link no meio de uma frase fica como está.** A própria norma de
  acessibilidade abre exceção para ele, e esticá-lo estragaria a entrelinha.

---

## Navegação e conteúdo

### Mega menu

A barra de navegação virou um **mega menu** de dois painéis — Soluções e
Conteúdo —, com os caminhos agrupados e uma linha explicando cada um. O site
passou de uma página para cinco; links soltos na barra não davam mais conta.

Abre no **clique**, não no passar do mouse: em telefone e tablet não existe
hover, e painel que abre sozinho atrapalha mais do que ajuda. Fecha no Esc, no
clique fora e ao escolher um caminho. No celular, o menu de tela cheia ganhou
os mesmos grupos.

### Setores (`setores.html`)

Nove segmentos com profundidade real: como aquele mercado funciona, quem
costuma comprar, o que é exigido e onde as empresas do setor mais perdem.
É o padrão "indústrias" de site de consultoria — mostra domínio do assunto sem
precisar inventar caso de cliente.

### Bloco de conteúdo na home

Cartões editoriais com rótulo de categoria, título, resumo e tempo de leitura,
levando ao guia, aos setores e ao diagnóstico. O guia ocupa o cartão maior.

### Alerta de editais

Captura leve — e-mail, segmento e estado — que entra no banco de leads com
`origem = 'alerta-editais'`. Sem o banco configurado, abre o WhatsApp com o
pedido pronto, para o contato não se perder.

### Barra de progresso de leitura

Fina, no topo, nas páginas longas. Só aparece quando a página passa de 800px
de rolagem — numa página curta ela não diria nada.

---

## Biblioteca de componentes

`assets/css/componentes.css` + `assets/js/componentes.js` trazem avatar, grupo
de botões, dock de ações, carrossel, upload de arquivo e campos de formulário.

As referências que inspiraram esses componentes (Chakra UI, Base Web) são
bibliotecas **React**. Este site é HTML, CSS e JavaScript puros, então os
padrões foram reescritos aqui — mesmo comportamento, sem framework, na paleta
da OSC.

| Componente | Onde está em uso |
|---|---|
| Avatar (`.avt`) | cabeçalho e área do cliente; tem tamanhos, formas, anel, selo e grupo |
| Grupo de botões (`.btn-grupo`) | alterna entre Entrar e Criar conta |
| Dock de ações (`.dock`) | rodapé do formulário de perfil |
| Carrossel (`.carrossel`) | os 8 cards de serviços viram carrossel no celular e tablet, e voltam a ser grade no desktop |
| Upload (`.upload`) | foto do perfil, com arrastar e soltar |
| Caixa de marcar e chave | preferências de contato |

---

## Diagnóstico com IA

A seção **Diagnóstico** na home coleta oito respostas sobre a empresa e devolve na
tela um relatório: nível de maturidade, diagnóstico da situação atual, caminhos de
prospecção no mercado público, tipos de órgão que compram aquilo, termos para buscar
no PNCP, documentos a preparar, armadilhas do perfil e um plano com prazos.

O visitante recebe valor na hora; a OSC recebe um lead qualificado, gravado no banco
com `origem = 'relatorio-ia'`.

### ⚠️ A chave do Gemini NUNCA vai no site

Este é o ponto mais importante desta funcionalidade. Se a chave fosse chamada direto
do JavaScript da página, **qualquer visitante a leria** abrindo o inspetor do
navegador — e poderia usá-la à vontade, na sua conta.

Por isso o desenho é:

```
navegador  →  POST /api/relatorio  →  server.js  →  API do Gemini
 (sem chave)     (no seu domínio)    (guarda a chave)
```

A chave fica em `GEMINI_API_KEY`, no ambiente do servidor. O navegador nunca a vê.

### Ligar

1. Pegue a chave no Google AI Studio.
2. Copie `.env.example` para `.env` e preencha `GEMINI_API_KEY` — ou cadastre a
   variável no painel da Hostinger, em variáveis de ambiente.
3. **O site precisa rodar como aplicação Node** (`npm start`). Em hospedagem
   estática pura o `server.js` não roda e o endpoint não existe.
4. Reinicie a aplicação.

Sem a chave configurada, o endpoint responde 503 e o formulário mostra uma mensagem
clara com o WhatsApp — nada quebra.

### Proteções

| Proteção | Por quê |
|---|---|
| Limite por IP (`LIMITE_POR_IP`, padrão 5/hora) | um endpoint de IA aberto na internet é convite para queimar sua cota |
| Teto global (`LIMITE_GLOBAL`, padrão 200/hora) | protege a conta mesmo sob abuso distribuído |
| Cota só conta chamada que vai ao Gemini | quem erra um campo e reenvia não é punido |
| Corpo limitado a 16 KB | evita envio abusivo de texto |
| Campo-armadilha no formulário | barra robô |
| Erro da API nunca volta ao navegador | a resposta de erro do Google pode ecoar a chave; ela fica só no log do servidor |
| Saída escapada no HTML | o que o modelo devolve não executa script na página |

### O que o prompt proíbe

O modelo é instruído a **não inventar**: nada de número de edital, nome de órgão com
contratação em aberto, valor de contrato, quantidade de oportunidades ou estatística.
Ele não consulta base em tempo real. Também não pode prometer resultado nem citar
limites legais em dinheiro (que mudam por decreto).

O relatório sai com um aviso fixo na tela dizendo exatamente isso. **Não remova esse
aviso** — ele é o que separa uma ferramenta honesta de uma promessa que a OSC não
pode cumprir.

### Trocar o modelo

`GEMINI_MODEL` no `.env`. O padrão é `gemini-2.5-flash`. Se a sua conta não tiver
acesso, o endpoint responde 502 e o log do servidor mostra o motivo exato.

---

## Guia de licitações

`guia-licitacoes.html` é uma página de conteúdo sobre contratações públicas sob a
Lei 14.133/2021: o que é licitação, as fases do processo, modalidades, dispensa e
inexigibilidade, onde achar editais (PNCP e plataformas), cadastro no SICAF e no
Licitações-e, passo a passo do pregão, documentos de habilitação, benefícios de ME
e EPP, recursos e impugnação, checklist e links oficiais.

Serve a três propósitos: buscador (as pessoas procuram "como participar de
licitação"), autoridade, e material para o comercial mandar a um cliente em dúvida.
Cada bloco pesado termina apontando para o contato.

Na home, a seção **Como funciona** resume o caminho em quatro passos e leva ao guia.

### Cuidado ao atualizar

**Não publique valores em dinheiro nesta página.** Os limites de dispensa e os
cortes de ME/EPP são corrigidos periodicamente, e número errado num site de
consultoria de licitações custa credibilidade justamente com quem entende do
assunto. O texto descreve o mecanismo e manda conferir o valor vigente no PNCP ou
no edital — mantenha assim.

Pelo mesmo motivo o guia abre e fecha avisando que é orientação geral e que quem
manda é o edital. Não remova esses avisos.

---

## Publicar na Hostinger

O site é **HTML estático**. Há dois caminhos, e vale saber em qual você está.

### 1. Hospedagem comum (o caminho normal)

Envie os arquivos para a pasta `public_html` pelo Gerenciador de Arquivos ou por
FTP. Precisa de: `index.html`, `guia-licitacoes.html`, a pasta `assets/` e o
`.htaccess`.

Neste caminho o `package.json` e o `server.js` **não são usados** — o servidor da
Hostinger entrega o `index.html` sozinho. Eles não atrapalham; ficam parados.

**Atenção:** sem o `server.js` rodando, o diagnóstico com IA não funciona, porque não
existe `/api/relatorio`. O formulário avisa e oferece o WhatsApp. Para ter a IA, use
o caminho 2 abaixo.

Mais simples ainda: envie `osc-landing-page.html` e `osc-guia-licitacoes.html`,
renomeie o primeiro para `index.html` e pronto. Dois arquivos, site no ar — os
links entre eles já saem ajustados pelo `build.py`.

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

Tudo respeita `prefers-reduced-motion`. Nada disso depende de biblioteca
externa: reveal, acordeões e o anel são IntersectionObserver + CSS, escritos à
mão. A página não busca nenhum script fora do próprio servidor.

---

## Ritmo da página e o conserto da rolagem

A home tinha **12.400 px — quase 14 telas de 900 px — em 12 seções, seis delas
escuras em sequência.** Quem rolava atravessava um bloco verde atrás do outro
sem respiro, e o texto parava de ser lido no meio do caminho.

Além do tamanho, havia um defeito de verdade: **seis dos blocos com
`data-reveal` ficavam invisíveis depois de uma rolagem rápida.** O
IntersectionObserver sozinho não dava conta — numa passada rápida de dedo ou
num salto por âncora, o navegador não emite a entrada de cada bloco, e a pessoa
chegava numa faixa verde ou creme vazia. Era isso que estava horrível na tela,
não a escolha de cor.

**O que foi feito**

| Antes | Depois |
|---|---|
| 12.400 px, 13,8 telas, 12 seções | **9.906 px, 11,0 telas, 10 seções** |
| seis seções escuras seguidas | escuro e creme alternando o tempo todo |
| `#como-funciona` repetia a metodologia | removida |
| `#setores` ocupava uma seção inteira | virou uma faixa de chips dentro de `#conteudo` |
| `#alerta` com 734 px | **244 px**, uma faixa de uma linha só |
| `#duvidas` escura, logo antes do rodapé escuro | creme, na variante `.faq--claro` |
| `.section` com até 136 px de respiro vertical | até 96 px |
| fundo em canvas com até 16 monogramas a 25 % | até 9, a 7–14 % |

**A rede de segurança do reveal** (`assets/js/main.js`): o
IntersectionObserver continua sendo o caminho normal, e junto dele roda uma
varredura de rolagem limitada por `requestAnimationFrame` que revela qualquer
bloco cujo topo já passou de 95 % da altura da janela. Os dois juntos fecham o
buraco.

Medido com Playwright em três cenários — rolagem rápida de roda, salto direto
ao fim e âncora no meio da página: **0 de 36 blocos invisíveis** nos três.

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
