-- =========================================================
-- SISTEMA DE GESTÃO DE MANUTENÇÃO PREDIAL
-- Migração inicial (tabelas + RLS + seed)
-- =========================================================

-- Perfis de usuário (perfil ligado ao auth.uid())
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  usuario text unique not null,
  nome text not null default '',
  perfil text not null default 'Usuario'
    check (perfil in ('Dev', 'Admin', 'Usuario')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Ordens de serviço
create table if not exists public.ordens_servico (
  id text primary key,
  fabrica text not null default '',
  solicitante text not null default '',
  data date,
  local text not null default '',
  descricao text not null default '',
  categoria text not null default '',
  subcategoria text not null default '',
  criticidade text not null default '',
  evidencia text not null default '',   -- caminho/path no storage
  map_x double precision,
  map_y double precision,
  responsavel text not null default '',
  data_prevista date,
  executado_em date,
  reprogramado date,
  criado_em timestamptz not null default now()
);

create index if not exists idx_ordens_fabrica on public.ordens_servico (fabrica);
create index if not exists idx_ordens_criado on public.ordens_servico (criado_em desc);

-- Configurações chave-valor (JSON)
create table if not exists public.configuracoes (
  chave text primary key,
  valor jsonb not null default 'null'::jsonb,
  criado_em timestamptz not null default now()
);

-- -----------------------------------------------------------------
-- ENABLE RLS
-- -----------------------------------------------------------------
alter table public.perfis enable row level security;
alter table public.ordens_servico enable row level security;
alter table public.configuracoes enable row level security;

-- -----------------------------------------------------------------
-- FUNÇÃO AUXILIAR DE RLS (security definer evita recursão de policy)
-- -----------------------------------------------------------------
create or replace function public.eu_sou(ps text[]) returns boolean
language sql security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and perfil = any(ps) and ativo
  );
$$;

grant execute on function public.eu_sou(text[]) to authenticated, anon;

-- -----------------------------------------------------------------
-- POLÍTICAS: perfis (cada usuário lê o próprio; Dev lê/escreve todos)
-- -----------------------------------------------------------------
create policy "perfis_self_select" on public.perfis
  for select using (auth.uid() = id);

create policy "perfis_dev_all" on public.perfis
  for all to authenticated using (public.eu_sou(array['Dev']))
  with check (public.eu_sou(array['Dev']));

create policy "perfis_self_update" on public.perfis
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- -----------------------------------------------------------------
-- POLÍTICAS: ordens de serviço
-- -----------------------------------------------------------------
-- Todos os autenticados podem ler e abrir OS
create policy "ordens_auth_select" on public.ordens_servico
  for select to authenticated using (true);

create policy "ordens_auth_insert" on public.ordens_servico
  for insert to authenticated with check (true);

-- Apenas Admin e Dev atualizam/excluem (espelha exigirPerfil('Admin','Dev'))
create policy "ordens_admin_dev_update" on public.ordens_servico
  for update to authenticated using (public.eu_sou(array['Admin','Dev']))
  with check (public.eu_sou(array['Admin','Dev']));

create policy "ordens_admin_dev_delete" on public.ordens_servico
  for delete to authenticated using (public.eu_sou(array['Admin','Dev']));

-- -----------------------------------------------------------------
-- POLÍTICAS: configurações (leitura para todos; escrita Admin/Dev)
-- -----------------------------------------------------------------
create policy "config_auth_select" on public.configuracoes
  for select to authenticated using (true);

create policy "config_admin_dev_write" on public.configuracoes
  for insert to authenticated with check (public.eu_sou(array['Admin','Dev']));

create policy "config_admin_dev_update" on public.configuracoes
  for update to authenticated using (public.eu_sou(array['Admin','Dev']));

create policy "config_admin_dev_delete" on public.configuracoes
  for delete to authenticated using (public.eu_sou(array['Admin','Dev']));

-- -----------------------------------------------------------------
-- STORAGE: buckets para fotos e planta
-- -----------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('planta', 'planta', true)
on conflict (id) do nothing;

-- Permite o usuário autenticado enviar arquivos
create policy "evidencias_auth_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'evidencias');

create policy "evidencias_auth_select" on storage.objects
  for select to authenticated using (bucket_id = 'evidencias');

create policy "planta_auth_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'planta');

create policy "planta_auth_select" on storage.objects
  for select to authenticated using (bucket_id = 'planta');

-- -----------------------------------------------------------------
-- SEED: configurações iniciais
-- -----------------------------------------------------------------
insert into public.configuracoes (chave, valor) values
  ('conf_fabricas', '["Torre A", "Torre B"]'::jsonb),
  ('conf_solicitantes', '["Síndico", "Zelador", "Morador"]'::jsonb),
  ('conf_responsaveis', '["Manutenção Interna"]'::jsonb),
  ('conf_categorias', '["Hidrossanitário", "Elétrica", "Civil / Estrutural"]'::jsonb),
  ('conf_subcategorias', '{"Elétrica": ["Troca de Lâmpada", "Curto-circuito"]}'::jsonb),
  ('conf_locais', '{"Torre A": ["Térreo", "Garagem"]}'::jsonb)
on conflict (chave) do nothing;

-- =========================================================
-- FUNÇÃO PARA CADASTRAR O USUÁRIO INICIAL JOHN BYPASS
-- =========================================================
-- O primeiro DEV é criado manualmente no painel do Supabase Auth
-- (email admin@exemplo.com / senha) e o perfil pode ser inserido
-- via SQL com a subconsulta abaixo:
-- insert into public.perfis (id, usuario, nome, perfil)
-- select id, 'admin', 'Administrador', 'Admin' from auth.users where email = 'admin@exemplo.com'
-- on conflict (id) do update set perfil = 'Admin';

-- =========================================================
-- FUNÇÕES AUXILIARES DE ADMINISTRAÇÃO (somente Dev invoca)
-- =========================================================
-- Lista usuários (apenas Dev; security definer + guard de perfil)
create or replace function public.listar_usuarios()
returns setof public.perfis
language sql
security definer
set search_path = public
as $$
  select p1.* from public.perfis p1
  where exists (select 1 from public.perfis p2 where p2.id = auth.uid() and p2.perfil = 'Dev')
  order by p1.usuario;
$$;

revoke execute on function public.listar_usuarios() from public;
grant execute on function public.listar_usuarios() to authenticated;

-- NOTA: a criação de usuário é feita no front com
-- supabase.auth.signUp() (anon key) e depois:
-- insert into public.perfis (id, usuario, nome, perfil)
-- select id, 'usuario', 'Nome', 'Usuario' from auth.users where email = '...'