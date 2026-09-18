-- ==========================================================================
-- OSC — Contas de cliente
-- --------------------------------------------------------------------------
-- Rode este arquivo DEPOIS do schema.sql, no SQL Editor do Supabase.
--
-- A autenticação em si (senha, e-mail, recuperação) fica por conta do
-- Supabase Auth, na tabela auth.users. Aqui guardamos só o perfil: o que a
-- pessoa preencheu no cadastro e o avatar.
--
-- SEGURANÇA: cada pessoa enxerga e edita apenas o próprio perfil. A regra
-- está na Row Level Security abaixo, e vale mesmo se alguém chamar a API
-- direto, sem passar pelo site.
-- ==========================================================================

create extension if not exists "pgcrypto";

-- --------------------------------------------------------------------------
-- Perfil do cliente
-- --------------------------------------------------------------------------
create table if not exists public.perfis (
  id            uuid primary key references auth.users(id) on delete cascade,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  nome          text not null,
  empresa       text,
  whatsapp      text,
  cnpj          text,
  segmento      text,
  cargo         text,

  -- Avatar guardado como data URL de uma imagem já reduzida a 256px no
  -- navegador. Evita depender de um serviço de arquivos para poucos KB.
  -- Se a base de clientes crescer muito, migre para o Supabase Storage.
  avatar        text,

  aceita_novidades boolean not null default false,

  constraint perfis_nome_tamanho    check (char_length(nome) between 2 and 120),
  constraint perfis_empresa_tamanho check (empresa is null or char_length(empresa) <= 160),
  constraint perfis_avatar_tamanho  check (avatar is null or char_length(avatar) <= 300000)
);

comment on table public.perfis is 'Perfil dos clientes cadastrados no site da OSC.';
comment on column public.perfis.avatar is 'Data URL de imagem 256x256 gerada no navegador.';

create index if not exists perfis_empresa_idx on public.perfis (empresa);

-- Mantém atualizado_em em dia sem o site precisar lembrar
create or replace function public.toca_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

drop trigger if exists perfis_atualizado_em on public.perfis;
create trigger perfis_atualizado_em
  before update on public.perfis
  for each row execute function public.toca_atualizado_em();

-- --------------------------------------------------------------------------
-- Row Level Security — cada um só mexe no seu
-- --------------------------------------------------------------------------
alter table public.perfis enable row level security;

drop policy if exists "vê o próprio perfil" on public.perfis;
create policy "vê o próprio perfil"
  on public.perfis for select to authenticated
  using (auth.uid() = id);

drop policy if exists "cria o próprio perfil" on public.perfis;
create policy "cria o próprio perfil"
  on public.perfis for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "edita o próprio perfil" on public.perfis;
create policy "edita o próprio perfil"
  on public.perfis for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Sem policy para o papel anon: quem não entrou não lê nada.

-- --------------------------------------------------------------------------
-- Liga o cadastro ao funil comercial
-- Quem cria conta também vira lead, para o time não perder o contato.
-- --------------------------------------------------------------------------
alter table public.leads add column if not exists perfil_id uuid references public.perfis(id) on delete set null;
create index if not exists leads_perfil_idx on public.leads (perfil_id);

-- --------------------------------------------------------------------------
-- Visão de apoio
-- --------------------------------------------------------------------------
create or replace view public.clientes_recentes as
  select p.id, p.criado_em, p.nome, p.empresa, p.whatsapp, p.segmento,
         (p.avatar is not null) as tem_avatar
  from public.perfis p
  order by p.criado_em desc;
