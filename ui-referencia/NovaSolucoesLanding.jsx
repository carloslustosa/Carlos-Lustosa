/* =============================================================================
   NOVA | Soluções — Landing page do SIGNUS ERP
   -----------------------------------------------------------------------------
   ATENÇÃO: empresa, produto, números e depoimentos aqui são FICTÍCIOS. Este
   arquivo é um exercício de interface — não é conteúdo da OSC e não deve ser
   publicado como se fosse.

   Single Page Application em React + Tailwind CSS, tudo em um arquivo.
   Dependências: react, react-dom, lucide-react, tailwindcss.

   Como usar:
     import NovaSolucoesLanding from './NovaSolucoesLanding';
     <NovaSolucoesLanding />

   O Tailwind precisa varrer este arquivo: aponte o `content` do
   tailwind.config.js para a pasta que contém este .jsx.

   A pilha tipográfica de `font-serif` do Tailwind já resolve sem fonte extra.
   Para ficar igual ao mock, carregue uma serifada de texto e aponte nela:
     theme: { extend: { fontFamily: { serif: ['"Source Serif 4"', 'Georgia', 'serif'] } } }
   ============================================================================= */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Menu, X, ArrowRight, ArrowUpRight, Check, Plus, Minus,
  CircleDollarSign, Receipt, Boxes, Users, LineChart, Truck,
  Smartphone, WifiOff, Bell, ScanLine, Fingerprint, Gauge,
  Mail, Phone, MapPin, Send, ShieldCheck, Loader2, CheckCircle2,
} from 'lucide-react';

/* -----------------------------------------------------------------------------
   1. CONTEÚDO
   Separado da marcação para que trocar texto não signifique mexer em layout.
   -------------------------------------------------------------------------- */

const NAV = [
  { rotulo: 'Módulos', href: '#modulos' },
  { rotulo: 'No celular', href: '#mobile' },
  { rotulo: 'Implantação', href: '#implantacao' },
  { rotulo: 'Contato', href: '#contato' },
];

const MODULOS = [
  {
    id: 'financeiro',
    icone: CircleDollarSign,
    nome: 'Financeiro',
    resumo: 'Contas a pagar e a receber, conciliação bancária e fluxo de caixa projetado.',
    itens: ['Conciliação por OFX e API bancária', 'Régua de cobrança automática', 'Fluxo de caixa com 12 meses de projeção'],
  },
  {
    id: 'fiscal',
    icone: Receipt,
    nome: 'Fiscal',
    resumo: 'Emissão de documentos, apuração de impostos e obrigações acessórias no prazo.',
    itens: ['NF-e, NFS-e, NFC-e e CT-e', 'Apuração de ICMS, PIS, COFINS e IPI', 'SPED Fiscal e Contribuições'],
  },
  {
    id: 'estoque',
    icone: Boxes,
    nome: 'Estoque',
    resumo: 'Saldo por depósito, custo médio e inventário sem parar a operação.',
    itens: ['Multidepósito e transferência entre filiais', 'Curva ABC e ponto de reposição', 'Inventário rotativo pelo celular'],
  },
  {
    id: 'vendas',
    icone: Users,
    nome: 'Vendas e CRM',
    resumo: 'Do primeiro contato ao pedido faturado, na mesma base de dados.',
    itens: ['Funil por etapa e por vendedor', 'Tabela de preço e política de desconto', 'Comissão calculada no fechamento'],
  },
  {
    id: 'bi',
    icone: LineChart,
    nome: 'Indicadores',
    resumo: 'Painéis de margem, giro e inadimplência atualizados junto com o lançamento.',
    itens: ['Painel por diretoria, filial e produto', 'Alerta quando o indicador sai da faixa', 'Exportação para planilha e PDF'],
  },
  {
    id: 'logistica',
    icone: Truck,
    nome: 'Logística',
    resumo: 'Separação, expedição e frete ligados ao pedido de venda.',
    itens: ['Onda de separação e conferência', 'Cotação de frete por transportadora', 'Rastreio devolvido ao cliente'],
  },
];

const RECURSOS_MOBILE = [
  { icone: WifiOff, titulo: 'Funciona sem sinal', texto: 'O aplicativo grava no aparelho e sincroniza sozinho quando a conexão volta. Vendedor em rota não para.' },
  { icone: ScanLine, titulo: 'Leitura de código de barras', texto: 'A câmera do celular faz conferência de entrada, inventário e separação, sem coletor dedicado.' },
  { icone: Bell, titulo: 'Aprovação por notificação', texto: 'Pedido fora da política de desconto chega ao gestor na hora, e é liberado com um toque.' },
  { icone: Fingerprint, titulo: 'Entrada por biometria', texto: 'Acesso pela digital ou pelo rosto, com sessão que expira e trilha de auditoria por usuário.' },
];

const IMPLANTACAO = [
  { n: '01', titulo: 'Diagnóstico', texto: 'Duas semanas acompanhando a operação real, mapeando processo e volume antes de configurar qualquer tela.' },
  { n: '02', titulo: 'Configuração', texto: 'Parametrização fiscal, plano de contas e cadastros migrados da base atual, com conferência lado a lado.' },
  { n: '03', titulo: 'Operação assistida', texto: 'Trinta dias com um consultor junto do time, no mesmo horário da sua operação, até a rotina andar sozinha.' },
];

/* -----------------------------------------------------------------------------
   2. UTILIDADES
   -------------------------------------------------------------------------- */

/** Passou de `limite` px de rolagem? Usado pelo cabeçalho. */
function useRolagem(limite = 24) {
  const [passou, setPassou] = useState(false);
  useEffect(() => {
    const aoRolar = () => setPassou(window.scrollY > limite);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, [limite]);
  return passou;
}

/**
 * Revela o bloco quando ele entra na tela.
 * O IntersectionObserver sozinho deixa passar bloco em rolagem muito rápida,
 * então a primeira medida é feita na montagem e quem já está visível entra
 * revelado — nada aqui depende do observer disparar.
 */
function useRevelar(margem = '0px 0px -12% 0px') {
  const ref = useRef(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisivel(true);
      return;
    }

    // já está na tela no primeiro quadro? revela sem esperar evento nenhum
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.95) {
      setVisivel(true);
      return;
    }

    const obs = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) {
        setVisivel(true);
        obs.disconnect();
      }
    }, { rootMargin: margem, threshold: 0 });

    obs.observe(el);
    return () => obs.disconnect();
  }, [margem]);

  return [ref, visivel];
}

/** Bloco que sobe ao aparecer. `atraso` em milissegundos. */
function Revelar({ children, atraso = 0, className = '' }) {
  const [ref, visivel] = useRevelar();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${atraso}ms` }}
      className={[
        'transition-all duration-700 ease-out motion-reduce:transition-none',
        visivel ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

/* -----------------------------------------------------------------------------
   3. PEÇAS DE INTERFACE
   -------------------------------------------------------------------------- */

function Logo({ claro = false, className = '' }) {
  return (
    <a
      href="#topo"
      aria-label="NOVA Soluções, ir para o topo"
      className={`group inline-flex min-h-[44px] items-baseline gap-2 py-2 ${className}`}
    >
      <span
        className={`font-serif text-2xl font-semibold tracking-tight transition-colors duration-300 ${
          claro ? 'text-white' : 'text-[#003822]'
        }`}
      >
        NOVA
      </span>
      <span
        aria-hidden="true"
        className={`text-lg font-light transition-colors duration-300 ${
          claro ? 'text-emerald-300/60' : 'text-[#003822]/30'
        }`}
      >
        |
      </span>
      <span
        className={`text-sm font-medium uppercase tracking-[0.18em] transition-colors duration-300 ${
          claro ? 'text-emerald-100/70' : 'text-[#003822]/60'
        }`}
      >
        Soluções
      </span>
    </a>
  );
}

function Botao({ como = 'a', variante = 'solido', className = '', children, ...props }) {
  const Tag = como;
  const base =
    'group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold ' +
    'transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
    'focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60';

  const variantes = {
    solido: 'bg-emerald-400 text-[#003822] hover:bg-emerald-300 hover:shadow-lg hover:shadow-emerald-500/20 focus-visible:ring-offset-[#003822]',
    escuro: 'bg-[#003822] text-white hover:bg-[#00492c] hover:shadow-lg hover:shadow-[#003822]/20 focus-visible:ring-offset-slate-50',
    contorno: 'border border-white/25 text-white hover:border-white/60 hover:bg-white/5 focus-visible:ring-offset-[#003822]',
    contornoEscuro: 'border border-[#003822]/20 text-[#003822] hover:border-[#003822]/60 hover:bg-[#003822]/5 focus-visible:ring-offset-slate-50',
  };

  return (
    <Tag className={`${base} ${variantes[variante]} ${className}`} {...props}>
      {children}
    </Tag>
  );
}

function Rotulo({ children, claro = false }) {
  return (
    <p
      className={`mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] ${
        claro ? 'text-emerald-300' : 'text-[#003822]/50'
      }`}
    >
      <span aria-hidden="true" className={`h-px w-8 ${claro ? 'bg-emerald-300/60' : 'bg-[#003822]/25'}`} />
      {children}
    </p>
  );
}

/* -----------------------------------------------------------------------------
   4. CABEÇALHO
   Transparente sobre o hero escuro, sólido depois da primeira rolagem.
   No celular vira menu de tela cheia — com a rolagem do corpo travada,
   senão o fundo desliza por baixo do painel.
   -------------------------------------------------------------------------- */

function Header() {
  const rolou = useRolagem(24);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    document.body.style.overflow = aberto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [aberto]);

  useEffect(() => {
    const aoTeclar = (e) => { if (e.key === 'Escape') setAberto(false); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  const claro = !rolou && !aberto;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          rolou || aberto
            ? 'border-b border-slate-200/80 bg-white/95 backdrop-blur-md'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:h-20 md:px-8 lg:px-12">
          <Logo claro={claro} />

          <nav aria-label="Principal" className="hidden items-center gap-9 lg:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`relative inline-flex min-h-[44px] items-center text-sm font-medium transition-colors duration-300 after:absolute after:inset-x-0 after:bottom-3 after:h-px after:origin-left after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100 ${
                  claro
                    ? 'text-white/80 hover:text-white after:bg-emerald-300'
                    : 'text-slate-600 hover:text-[#003822] after:bg-[#003822]'
                }`}
              >
                {item.rotulo}
              </a>
            ))}
          </nav>

          <div className="hidden lg:block">
            <Botao href="#contato" variante={claro ? 'solido' : 'escuro'}>
              Agendar demonstração
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Botao>
          </div>

          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            aria-controls="menu-celular"
            aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
            className={`-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-300 lg:hidden ${
              claro ? 'text-white hover:bg-white/10' : 'text-[#003822] hover:bg-[#003822]/5'
            }`}
          >
            {aberto ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* painel de tela cheia — só existe abaixo de lg */}
      <div
        id="menu-celular"
        aria-hidden={!aberto}
        className={`fixed inset-0 z-40 flex flex-col bg-white pt-16 transition-opacity duration-300 md:pt-20 lg:hidden ${
          aberto ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      >
        <nav aria-label="Principal, celular" className="flex-1 overflow-y-auto px-5 py-8 md:px-8">
          {NAV.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setAberto(false)}
              style={{ transitionDelay: `${i * 45}ms` }}
              className={`flex items-center justify-between border-b border-slate-200 py-5 font-serif text-2xl text-[#003822] transition-all duration-300 md:text-3xl ${
                aberto ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
              }`}
            >
              {item.rotulo}
              <ArrowUpRight className="h-5 w-5 text-[#003822]/35" />
            </a>
          ))}
        </nav>
        <div className="border-t border-slate-200 px-5 py-6 md:px-8">
          <Botao href="#contato" variante="escuro" onClick={() => setAberto(false)} className="w-full">
            Agendar demonstração
            <ArrowRight className="h-4 w-4" />
          </Botao>
        </div>
      </div>
    </>
  );
}

/* -----------------------------------------------------------------------------
   5. HERO
   -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section id="topo" className="relative overflow-hidden bg-[#003822] pt-28 pb-20 md:pt-36 md:pb-28 lg:pt-44 lg:pb-32">
      {/* grade fina ao fundo, como as capas da BCG */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07]">
        <div className="mx-auto grid h-full max-w-7xl grid-cols-4 px-5 md:px-8 lg:grid-cols-12 lg:px-12">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={`border-l border-white ${i >= 4 ? 'hidden lg:block' : ''}`} />
          ))}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-emerald-400/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8 lg:px-12">
        <div className="grid items-end gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <Revelar>
              <Rotulo claro>SIGNUS ERP</Rotulo>
              <h1 className="font-serif text-4xl leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl">
                A gestão inteira da sua empresa{' '}
                <span className="text-emerald-300">em uma base de dados só.</span>
              </h1>
            </Revelar>

            <Revelar atraso={120}>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-emerald-50/70 md:text-lg">
                Financeiro, fiscal, estoque, vendas e indicadores no mesmo sistema. Você
                liga apenas os módulos de que precisa agora e acrescenta os outros quando
                a operação pedir — sem trocar de software e sem migrar de novo.
              </p>
            </Revelar>

            <Revelar atraso={220}>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Botao href="#contato" variante="solido" className="w-full sm:w-auto">
                  Agendar demonstração
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Botao>
                <Botao href="#modulos" variante="contorno" className="w-full sm:w-auto">
                  Ver os módulos
                </Botao>
              </div>
            </Revelar>
          </div>

          {/* painel lateral: vira primeiro bloco no celular, coluna no desktop */}
          <div className="lg:col-span-5 lg:pb-3">
            <Revelar atraso={300}>
              <div className="border-t border-white/15 pt-8">
                <p className="font-serif text-2xl leading-snug text-white md:text-3xl">
                  Modular de verdade.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-emerald-50/60">
                  Cada módulo funciona sozinho e conversa com os demais. Quem começa pelo
                  financeiro não precisa refazer nada ao ligar o fiscal seis meses depois.
                </p>

                <ul className="mt-8 space-y-4">
                  {[
                    'Seis módulos, ligados um a um',
                    'Implantação assistida por consultor',
                    'Aplicativo que funciona sem sinal',
                  ].map((linha) => (
                    <li key={linha} className="flex items-start gap-3 text-sm text-emerald-50/80">
                      <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-300" />
                      {linha}
                    </li>
                  ))}
                </ul>
              </div>
            </Revelar>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -----------------------------------------------------------------------------
   6. MÓDULOS
   Um cartão por módulo. No celular a lista de itens fica recolhida atrás de um
   botão — seis cartões abertos seriam rolagem demais no telefone. A partir de
   md tudo aparece aberto e o botão some.
   -------------------------------------------------------------------------- */

function CartaoModulo({ modulo, atraso }) {
  const [aberto, setAberto] = useState(false);
  const Icone = modulo.icone;

  return (
    <Revelar atraso={atraso} className="h-full">
      <article className="group flex h-full flex-col border border-slate-200 bg-white p-7 transition-all duration-300 hover:border-[#003822] hover:shadow-xl hover:shadow-slate-900/5 md:p-8">
        <span className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#003822]/5 text-[#003822] transition-all duration-300 group-hover:bg-[#003822] group-hover:text-emerald-300">
          <Icone className="h-5 w-5" />
        </span>

        <h3 className="font-serif text-2xl text-[#003822]">{modulo.nome}</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{modulo.resumo}</p>

        {/* md+ : sempre aberto. Abaixo disso, acordeão. */}
        <div
          className={`grid transition-all duration-300 md:mt-6 md:grid-rows-[1fr] md:opacity-100 ${
            aberto ? 'mt-6 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0 md:mt-6'
          }`}
        >
          <div className="overflow-hidden">
            <ul className="space-y-3 border-t border-slate-200 pt-5">
              {modulo.itens.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-slate-600">
                  <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="mt-6 inline-flex min-h-[44px] items-center gap-2 self-start text-xs font-semibold uppercase tracking-[0.16em] text-[#003822] transition-colors duration-300 hover:text-emerald-700 md:hidden"
        >
          {aberto ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {aberto ? 'Fechar' : 'O que entra'}
        </button>

        <div className="mt-auto hidden pt-8 md:block">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#003822]/40 transition-all duration-300 group-hover:gap-3 group-hover:text-[#003822]">
            Módulo {modulo.id}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </article>
    </Revelar>
  );
}

function Modulos() {
  return (
    <section id="modulos" className="scroll-mt-20 bg-slate-50 py-20 md:py-28 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Revelar>
              <Rotulo>Módulos</Rotulo>
              <h2 className="font-serif text-3xl leading-tight tracking-tight text-[#003822] md:text-5xl">
                Ligue só o que a operação precisa hoje.
              </h2>
            </Revelar>
          </div>
          <div className="lg:col-span-6 lg:col-start-7 lg:pt-16">
            <Revelar atraso={120}>
              <p className="text-base leading-relaxed text-slate-600">
                Sistema de gestão costuma ser vendido em pacote fechado, e a empresa paga
                por tela que nunca abre. No SIGNUS cada módulo é contratado separado, roda
                sozinho e usa o mesmo cadastro dos outros — o que você ligar depois já
                nasce conversando com o que está no ar.
              </p>
            </Revelar>
          </div>
        </div>

        <div className="mt-14 grid gap-px border border-slate-200 bg-slate-200 md:mt-16 md:grid-cols-2 lg:grid-cols-3">
          {MODULOS.map((m, i) => (
            <CartaoModulo key={m.id} modulo={m} atraso={i * 70} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* -----------------------------------------------------------------------------
   7. NO CELULAR
   Maquete de telefone feita só com Tailwind — nada de imagem externa.
   -------------------------------------------------------------------------- */

function Telefone() {
  return (
    <div className="relative mx-auto w-[17rem] md:w-[19rem]">
      <div
        aria-hidden="true"
        className="absolute -inset-10 rounded-full bg-emerald-400/10 blur-3xl"
      />
      <div className="relative rounded-[2.5rem] border border-white/15 bg-[#002516] p-3 shadow-2xl shadow-black/40">
        <div className="relative overflow-hidden rounded-[1.9rem] bg-slate-50">
          {/* recorte da câmera */}
          <div aria-hidden="true" className="absolute left-1/2 top-2.5 h-5 w-20 -translate-x-1/2 rounded-full bg-[#002516]" />

          <div className="px-5 pb-6 pt-11">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Pedido 4.219
            </p>
            <p className="mt-1 font-serif text-xl text-[#003822]">Mercearia Bom Preço</p>

            <div className="mt-5 rounded-2xl bg-[#003822] p-4">
              <p className="text-[0.72rem] uppercase tracking-[0.16em] text-emerald-300/70">
                Total do pedido
              </p>
              <p className="mt-1 font-serif text-2xl text-white">R$ 12.480,00</p>
              <div className="mt-3 flex items-center gap-2 text-[0.75rem] leading-snug text-emerald-50/60">
                <WifiOff className="h-3.5 w-3.5 text-emerald-300" />
                Salvo no aparelho — sincroniza depois
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {[
                ['Arroz tipo 1, 5 kg', '40 un'],
                ['Óleo de soja 900 ml', '72 un'],
                ['Café torrado 500 g', '36 un'],
              ].map(([item, qtd]) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
                >
                  <span className="text-[0.78rem] text-slate-600">{item}</span>
                  <span className="text-[0.75rem] font-semibold text-[#003822]">{qtd}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 rounded-full bg-emerald-400 py-3 text-[0.78rem] font-semibold text-[#003822]">
              <Check className="h-3.5 w-3.5" />
              Fechar pedido
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Mobile() {
  return (
    <section id="mobile" className="scroll-mt-20 overflow-hidden bg-[#003822] py-20 md:py-28 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8 lg:px-12">
        <div className="grid items-center gap-16 lg:grid-cols-12 lg:gap-12">
          {/* no celular a maquete vem primeiro; no desktop vai para a direita */}
          <div className="order-1 lg:order-2 lg:col-span-5 lg:col-start-8">
            <Revelar>
              <Telefone />
            </Revelar>
          </div>

          <div className="order-2 lg:order-1 lg:col-span-6">
            <Revelar>
              <Rotulo claro>No celular</Rotulo>
              <h2 className="font-serif text-3xl leading-tight tracking-tight text-white md:text-5xl">
                A operação não acontece sentada numa mesa.
              </h2>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-emerald-50/70">
                Vendedor em rota, conferente no depósito e gestor fora do escritório usam
                o mesmo aplicativo — e o que eles fazem entra direto na base, sem
                planilha no meio do caminho.
              </p>
            </Revelar>

            <dl className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2">
              {RECURSOS_MOBILE.map((r, i) => {
                const Icone = r.icone;
                return (
                  <Revelar key={r.titulo} atraso={120 + i * 80}>
                    <div className="border-t border-white/15 pt-5">
                      <dt className="flex items-center gap-3 font-serif text-lg text-white">
                        <Icone className="h-5 w-5 flex-none text-emerald-300" />
                        {r.titulo}
                      </dt>
                      <dd className="mt-2.5 text-sm leading-relaxed text-emerald-50/60">{r.texto}</dd>
                    </div>
                  </Revelar>
                );
              })}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -----------------------------------------------------------------------------
   8. IMPLANTAÇÃO
   -------------------------------------------------------------------------- */

function Implantacao() {
  return (
    <section id="implantacao" className="scroll-mt-20 bg-slate-50 py-20 md:py-28 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8 lg:px-12">
        <Revelar>
          <Rotulo>Implantação</Rotulo>
          <h2 className="max-w-2xl font-serif text-3xl leading-tight tracking-tight text-[#003822] md:text-5xl">
            Sistema novo só serve se a equipe usar.
          </h2>
        </Revelar>

        <div className="mt-14 grid gap-px border border-slate-200 bg-slate-200 md:mt-16 md:grid-cols-3">
          {IMPLANTACAO.map((etapa, i) => (
            <Revelar key={etapa.n} atraso={i * 90} className="h-full">
              <div className="group h-full bg-white p-8 transition-colors duration-300 hover:bg-[#003822] md:p-10">
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-[#003822]/35 transition-colors duration-300 group-hover:text-emerald-300">
                  {etapa.n}
                </span>
                <h3 className="mt-6 font-serif text-2xl text-[#003822] transition-colors duration-300 group-hover:text-white">
                  {etapa.titulo}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 transition-colors duration-300 group-hover:text-emerald-50/70">
                  {etapa.texto}
                </p>
              </div>
            </Revelar>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -----------------------------------------------------------------------------
   9. CONTATO
   Formulário controlado, com validação no envio e foco no primeiro campo
   errado — quem usa teclado ou leitor de tela precisa ser levado até o erro.
   -------------------------------------------------------------------------- */

const VAZIO = { nome: '', empresa: '', email: '', telefone: '', modulo: '', mensagem: '' };

function Campo({ id, rotulo, erro, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100/60"
      >
        {rotulo}
      </label>
      {children}
      {erro && (
        <p id={`${id}-erro`} role="alert" className="mt-2 text-xs text-rose-300">
          {erro}
        </p>
      )}
    </div>
  );
}

function Contato() {
  const [dados, setDados] = useState(VAZIO);
  const [erros, setErros] = useState({});
  const [estado, setEstado] = useState('parado'); // parado | enviando | enviado
  const formRef = useRef(null);

  const mudar = useCallback((e) => {
    const { name, value } = e.target;
    setDados((d) => ({ ...d, [name]: value }));
    setErros((x) => (x[name] ? { ...x, [name]: undefined } : x));
  }, []);

  const validar = (d) => {
    const e = {};
    if (d.nome.trim().length < 2) e.nome = 'Escreva seu nome.';
    if (d.empresa.trim().length < 2) e.empresa = 'Escreva o nome da empresa.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) e.email = 'Confira o e-mail.';
    if (d.telefone.replace(/\D/g, '').length < 10) e.telefone = 'Telefone com DDD.';
    if (!d.modulo) e.modulo = 'Escolha por onde começar.';
    return e;
  };

  const enviar = async (ev) => {
    ev.preventDefault();
    const achados = validar(dados);
    setErros(achados);

    if (Object.keys(achados).length) {
      const primeiro = formRef.current?.querySelector(`[name="${Object.keys(achados)[0]}"]`);
      primeiro?.focus();
      return;
    }

    setEstado('enviando');
    // Demonstração: troque por fetch('/api/contato', { method: 'POST', ... })
    await new Promise((r) => setTimeout(r, 900));
    setEstado('enviado');
    setDados(VAZIO);
  };

  const campo =
    'w-full rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-base text-white ' +
    'placeholder:text-emerald-50/30 transition-all duration-300 focus:border-emerald-300 ' +
    'focus:bg-white/[0.07] focus:outline-none focus:ring-1 focus:ring-emerald-300';

  return (
    <section id="contato" className="scroll-mt-20 bg-[#003822] py-20 md:py-28 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8 lg:px-12">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Revelar>
              <Rotulo claro>Contato</Rotulo>
              <h2 className="font-serif text-3xl leading-tight tracking-tight text-white md:text-5xl">
                Veja o SIGNUS rodando com os seus números.
              </h2>
              <p className="mt-6 text-base leading-relaxed text-emerald-50/70">
                A demonstração é feita sobre um recorte da sua operação, não sobre uma base
                de exemplo. Leva cerca de uma hora e você sai sabendo o que muda na prática.
              </p>

              <ul className="mt-10 space-y-5">
                {[
                  { icone: Mail, texto: 'contato@novasolucoes.exemplo', href: 'mailto:contato@novasolucoes.exemplo' },
                  { icone: Phone, texto: '(00) 0000-0000', href: 'tel:+550000000000' },
                  { icone: MapPin, texto: 'Endereço de exemplo — empresa fictícia', href: null },
                ].map(({ icone: Icone, texto, href }) => (
                  <li key={texto} className="flex items-center gap-4 text-sm text-emerald-50/80">
                    <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full border border-white/15">
                      <Icone className="h-4 w-4 text-emerald-300" />
                    </span>
                    {href ? (
                      <a
                        href={href}
                        className="inline-flex min-h-[44px] items-center transition-colors duration-300 hover:text-emerald-300"
                      >
                        {texto}
                      </a>
                    ) : (
                      texto
                    )}
                  </li>
                ))}
              </ul>
            </Revelar>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <Revelar atraso={120}>
              {estado === 'enviado' ? (
                <div
                  role="status"
                  className="flex h-full min-h-[22rem] flex-col items-start justify-center rounded-2xl border border-emerald-300/25 bg-white/[0.04] p-9 md:p-11"
                >
                  <CheckCircle2 className="h-10 w-10 text-emerald-300" />
                  <p className="mt-6 font-serif text-2xl text-white md:text-3xl">Pedido recebido.</p>
                  <p className="mt-3 text-sm leading-relaxed text-emerald-50/70">
                    Um consultor entra em contato em até um dia útil para combinar o horário
                    da demonstração.
                  </p>
                  <button
                    type="button"
                    onClick={() => setEstado('parado')}
                    className="mt-8 min-h-[44px] text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300 transition-colors duration-300 hover:text-white"
                  >
                    Enviar outro pedido
                  </button>
                </div>
              ) : (
                <form
                  ref={formRef}
                  onSubmit={enviar}
                  noValidate
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-9"
                >
                  <div className="grid gap-5 md:grid-cols-2">
                    <Campo id="nome" rotulo="Nome" erro={erros.nome}>
                      <input
                        id="nome" name="nome" type="text" autoComplete="name"
                        value={dados.nome} onChange={mudar} placeholder="Como podemos chamar você"
                        aria-invalid={!!erros.nome} aria-describedby={erros.nome ? 'nome-erro' : undefined}
                        className={campo}
                      />
                    </Campo>

                    <Campo id="empresa" rotulo="Empresa" erro={erros.empresa}>
                      <input
                        id="empresa" name="empresa" type="text" autoComplete="organization"
                        value={dados.empresa} onChange={mudar} placeholder="Razão social ou nome fantasia"
                        aria-invalid={!!erros.empresa} aria-describedby={erros.empresa ? 'empresa-erro' : undefined}
                        className={campo}
                      />
                    </Campo>

                    <Campo id="email" rotulo="E-mail" erro={erros.email}>
                      <input
                        id="email" name="email" type="email" autoComplete="email" inputMode="email"
                        value={dados.email} onChange={mudar} placeholder="voce@empresa.com.br"
                        aria-invalid={!!erros.email} aria-describedby={erros.email ? 'email-erro' : undefined}
                        className={campo}
                      />
                    </Campo>

                    <Campo id="telefone" rotulo="Telefone" erro={erros.telefone}>
                      <input
                        id="telefone" name="telefone" type="tel" autoComplete="tel" inputMode="tel"
                        value={dados.telefone} onChange={mudar} placeholder="(00) 00000-0000"
                        aria-invalid={!!erros.telefone} aria-describedby={erros.telefone ? 'telefone-erro' : undefined}
                        className={campo}
                      />
                    </Campo>

                    <div className="md:col-span-2">
                      <Campo id="modulo" rotulo="Por onde começar" erro={erros.modulo}>
                        <select
                          id="modulo" name="modulo" value={dados.modulo} onChange={mudar}
                          aria-invalid={!!erros.modulo} aria-describedby={erros.modulo ? 'modulo-erro' : undefined}
                          className={`${campo} appearance-none bg-[right_1rem_center] bg-no-repeat pr-10`}
                          style={{
                            backgroundImage:
                              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236ee7b7' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
                            backgroundSize: '18px',
                          }}
                        >
                          <option value="" className="bg-[#003822]">Selecione um módulo</option>
                          {MODULOS.map((m) => (
                            <option key={m.id} value={m.id} className="bg-[#003822]">{m.nome}</option>
                          ))}
                          <option value="todos" className="bg-[#003822]">Ainda não sei</option>
                        </select>
                      </Campo>
                    </div>

                    <div className="md:col-span-2">
                      <Campo id="mensagem" rotulo="Mensagem (opcional)">
                        <textarea
                          id="mensagem" name="mensagem" rows={4}
                          value={dados.mensagem} onChange={mudar}
                          placeholder="Conte em duas linhas como a empresa trabalha hoje"
                          className={`${campo} resize-y`}
                        />
                      </Campo>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-2.5 text-xs leading-relaxed text-emerald-50/45">
                      <ShieldCheck className="h-4 w-4 flex-none text-emerald-300/70" />
                      Usamos seus dados apenas para responder este pedido.
                    </p>
                    <Botao
                      como="button" type="submit" variante="solido"
                      disabled={estado === 'enviando'}
                      className="w-full whitespace-nowrap sm:w-auto sm:flex-none"
                    >
                      {estado === 'enviando' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enviando
                        </>
                      ) : (
                        <>
                          Agendar demonstração
                          <Send className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </>
                      )}
                    </Botao>
                  </div>
                </form>
              )}
            </Revelar>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -----------------------------------------------------------------------------
   10. RODAPÉ
   -------------------------------------------------------------------------- */

function Footer() {
  const ano = new Date().getFullYear();

  const colunas = [
    { titulo: 'Produto', itens: ['Módulos', 'No celular', 'Implantação', 'Integrações'] },
    { titulo: 'Empresa', itens: ['Sobre', 'Carreiras', 'Parceiros', 'Imprensa'] },
    { titulo: 'Suporte', itens: ['Central de ajuda', 'Documentação', 'Status', 'Falar com alguém'] },
  ];

  return (
    <footer className="border-t border-white/10 bg-[#002516]">
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-16 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Logo claro />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-emerald-50/50">
              Software de gestão modular para empresas que cresceram mais rápido do que os
              seus controles.
            </p>
          </div>

          {colunas.map((col) => (
            <div key={col.titulo} className="lg:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                {col.titulo}
              </h3>
              <ul className="mt-5 space-y-3">
                {col.itens.map((item) => (
                  <li key={item}>
                    <a
                      href="#topo"
                      className="inline-flex min-h-[44px] items-center text-sm text-emerald-50/55 transition-colors duration-300 hover:text-white"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Comece agora
            </h3>
            <Botao href="#contato" variante="contorno" className="mt-5 w-full">
              Demonstração
              <ArrowUpRight className="h-4 w-4" />
            </Botao>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-emerald-50/40">
            © {ano} NOVA Soluções — empresa fictícia, criada para demonstração de interface.
          </p>
          <div className="flex flex-wrap gap-x-7 gap-y-2">
            {['Privacidade', 'Termos', 'Cookies'].map((t) => (
              <a
                key={t}
                href="#topo"
                className="inline-flex min-h-[44px] items-center text-xs text-emerald-50/40 transition-colors duration-300 hover:text-emerald-300"
              >
                {t}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* -----------------------------------------------------------------------------
   11. PÁGINA
   -------------------------------------------------------------------------- */

export default function NovaSolucoesLanding() {
  // rolagem suave nas âncoras, respeitando quem pediu menos movimento
  useEffect(() => {
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const anterior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = suave ? 'smooth' : 'auto';
    return () => { document.documentElement.style.scrollBehavior = anterior; };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased [overflow-x:clip]">
      <a
        href="#modulos"
        className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-5 focus:z-[60] focus:rounded-full focus:bg-emerald-400 focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-[#003822]"
      >
        Pular para o conteúdo
      </a>

      <Header />
      <main>
        <Hero />
        <Modulos />
        <Mobile />
        <Implantacao />
        <Contato />
      </main>
      <Footer />
    </div>
  );
}
