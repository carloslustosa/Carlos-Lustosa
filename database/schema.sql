-- ==========================================================================
-- OSC — GESTÃO EMPRESARIAL E LICITAÇÕES
-- Banco de dados dos leads captados pelo site
-- --------------------------------------------------------------------------
-- Como usar (Supabase):
--   1. Crie um projeto em https://supabase.com (plano gratuito serve).
--   2. Abra o SQL Editor, cole este arquivo inteiro e execute.
--   3. Em Settings → API, copie a "Project URL" e a chave "anon public".
--   4. Preencha as duas no objeto DB do arquivo JS do site.
--
-- SEGURANÇA — leia antes de publicar:
--   A chave anon fica visível no código do site. Isso é o esperado: ela sozinha
--   não dá acesso a nada. Quem protege os dados é a Row Level Security abaixo,
--   que libera APENAS a inserção. Ninguém consegue ler, alterar ou apagar leads
--   pelo site — só você, logado no painel do Supabase.
--   NUNCA coloque a chave "service_role" no site.
-- ==========================================================================

create extension if not exists "pgcrypto";

-- --------------------------------------------------------------------------
-- Tabela principal
-- --------------------------------------------------------------------------
create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  criado_em       timestamptz not null default now(),

  -- Dados preenchidos pelo cliente
  nome            text not null,
  empresa         text not null,
  whatsapp        text not null,
  email           text not null,
  segmento        text,
  mensagem        text,

  -- Acompanhamento comercial (você edita pelo painel)
  status          text not null default 'novo',
  responsavel     text,
  observacoes     text,
  contatado_em    timestamptz,

  -- Origem do lead, para saber o que traz resultado
  origem          text not null default 'site',
  pagina          text,
  referrer        text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  user_agent      text,

  constraint leads_status_valido check (
    status in ('novo', 'contatado', 'qualificado', 'proposta', 'cliente', 'descartado')
  ),
  constraint leads_nome_tamanho     check (char_length(nome)     between 2 and 120),
  constraint leads_empresa_tamanho  check (char_length(empresa)  between 2 and 160),
  constraint leads_whatsapp_tamanho check (char_length(whatsapp) between 8 and 32),
  constraint leads_email_formato    check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  constraint leads_mensagem_tamanho check (mensagem is null or char_length(mensagem) <= 2000)
);

comment on table  public.leads is 'Leads captados pelo formulário do site da OSC.';
comment on column public.leads.status is 'novo | contatado | qualificado | proposta | cliente | descartado';

create index if not exists leads_criado_em_idx on public.leads (criado_em desc);
create index if not exists leads_status_idx    on public.leads (status);
create index if not exists leads_email_idx     on public.leads (email);

-- --------------------------------------------------------------------------
-- Row Level Security — o site só pode INSERIR
-- --------------------------------------------------------------------------
alter table public.leads enable row level security;

drop policy if exists "site pode inserir leads" on public.leads;
create policy "site pode inserir leads"
  on public.leads
  for insert
  to anon
  with check (
    -- o site nunca define o acompanhamento comercial nem a data
    status = 'novo'
    and responsavel  is null
    and observacoes  is null
    and contatado_em is null
  );

-- Sem policy de select/update/delete para o papel anon:
-- ninguém lê, altera ou apaga lead pelo site.

drop policy if exists "equipe autenticada administra leads" on public.leads;
create policy "equipe autenticada administra leads"
  on public.leads
  for all
  to authenticated
  using (true)
  with check (true);

-- --------------------------------------------------------------------------
-- Visões de apoio para o dia a dia
-- --------------------------------------------------------------------------
create or replace view public.leads_novos as
  select id, criado_em, nome, empresa, whatsapp, email, segmento, mensagem, origem
  from public.leads
  where status = 'novo'
  order by criado_em desc;

create or replace view public.leads_por_dia as
  select date_trunc('day', criado_em)::date as dia,
         count(*)                            as total,
         count(*) filter (where status = 'cliente') as viraram_cliente
  from public.leads
  group by 1
  order by 1 desc;

-- --------------------------------------------------------------------------
-- Trava simples contra envio repetido: o mesmo e-mail no mesmo minuto
-- --------------------------------------------------------------------------
create unique index if not exists leads_antiduplicado_idx
  on public.leads (email, date_trunc('minute', criado_em));
