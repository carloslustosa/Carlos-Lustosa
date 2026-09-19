# Referência de interface — NOVA | Soluções (SIGNUS ERP)

`NovaSolucoesLanding.jsx` é uma landing page completa em **React + Tailwind CSS**,
num arquivo só, no estilo de consultoria (título em serifada grande, grade
rigorosa, blocos de cor sólida, muito respiro).

## ⚠️ Leia isto antes de publicar qualquer coisa daqui

**NOVA | Soluções e o SIGNUS ERP não existem.** Empresa, produto, e-mail,
telefone e endereço são inventados para o exercício de interface.

Por isso **este arquivo não foi ligado ao site da OSC**, e não deve ser:

- A OSC é consultoria de gestão e licitações. Publicar uma página vendendo um
  ERP anunciaria um produto que a empresa não tem — e que nem existe.
- A identidade da OSC é o monograma de anel, o verde `#12301F` e as fontes
  Archivo + IBM Plex Mono. Esta página usa outro verde (`#003822`) e título em
  serifada, que o manual da OSC não prevê.
- O site da OSC é HTML, CSS e JavaScript puros, sem React e sem etapa de build
  de JSX. Ligar esta página exigiria uma segunda pilha inteira dentro do mesmo
  repositório.

Ela vive aqui como **material de referência**: serve para olhar o padrão visual,
decidir o que vale levar para o site da OSC e reaproveitar as soluções de
interface (cabeçalho que muda ao rolar, cartão de módulo, maquete de telefone,
formulário com validação).

## O que tem dentro

| Seção | O que faz |
|---|---|
| `Header` | Fixo. Transparente sobre o hero escuro, sólido depois de 24 px de rolagem. No celular vira menu de tela cheia, com a rolagem do corpo travada, fechamento no Esc e nos links. |
| `Hero` | Título em serifada com destaque em verde-claro, texto de apoio, dois botões e um painel lateral que vira o segundo bloco no celular. Grade fina ao fundo. |
| `Modulos` | Seis cartões (Financeiro, Fiscal, Estoque, Vendas e CRM, Indicadores, Logística) numa grade sem espaço entre as bordas. A lista de itens fica recolhida atrás de um botão até `md`, e aberta a partir dali. |
| `Mobile` | Duas colunas com maquete de telefone feita só com Tailwind — sem imagem externa — e quatro recursos. No celular a maquete vem primeiro. |
| `Implantacao` | Três etapas numeradas; o cartão inteiro inverte para o verde escuro no hover. |
| `Contato` | Formulário controlado com validação no envio, foco levado ao primeiro campo errado, estado de envio e tela de confirmação. |
| `Footer` | Quatro colunas, links legais e a nota de que a empresa é fictícia. |

Ícones: **lucide-react**. Animações: transições de Tailwind com
`duration-300`/`duration-700`, mais um `IntersectionObserver` próprio
(`useRevelar`) que revela cada bloco ao entrar na tela.

## Rodar

O repositório da OSC não tem React. Para ver esta página, monte um projeto à
parte:

```bash
npm create vite@latest nova -- --template react
cd nova
npm install lucide-react
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
cp ../ui-referencia/NovaSolucoesLanding.jsx src/
```

`tailwind.config.js`:

```js
export default {
  content: ['./index.html', './src/**/*.jsx'],
  theme: {
    extend: {
      // troque por uma serifada de texto se quiser o resultado do mock
      fontFamily: { serif: ['"Source Serif 4"', 'Georgia', 'serif'] },
    },
  },
  plugins: [],
};
```

`src/main.jsx`:

```jsx
import NovaSolucoesLanding from './NovaSolucoesLanding.jsx';
// ... createRoot(...).render(<NovaSolucoesLanding />)
```

O `src/index.css` precisa das três diretivas do Tailwind
(`@tailwind base; @tailwind components; @tailwind utilities;`).

## Conferido

Compilado com Vite e aberto no Chromium em 1440×900, 768×1024, 390×844 e
320×568:

- nenhuma rolagem lateral em nenhuma das quatro larguras;
- nenhum texto abaixo de 11,5 px e nenhum campo abaixo de 16 px (o Safari do
  iPhone dá zoom sozinho abaixo disso);
- todo alvo de toque com pelo menos 44 px;
- nenhum erro de JavaScript;
- 20 verificações de interação passando: menu, acordeão, âncoras, cabeçalho ao
  rolar, validação do formulário e tela de confirmação.

Dois defeitos apareceram nessa conferência e foram corrigidos aqui:

1. **O painel do menu de celular usava o atributo `hidden`.** A classe `flex`
   do Tailwind ganha dele, então, fechado, o menu virava uma camada branca de
   tela cheia por cima da página inteira, comendo todos os cliques. Agora o
   estado fechado é `invisible opacity-0`, que não briga com `display`.
2. **O comentário de cabeçalho do arquivo continha `**/*`**, que fechava o
   bloco `/* */` antes da hora e quebrava a compilação.
