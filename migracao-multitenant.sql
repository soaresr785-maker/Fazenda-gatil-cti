-- ============================================================
-- MIGRAÇÃO MULTI-TENANT — FelineOS
-- Execute em ordem, no SQL Editor do Supabase.
-- Faça backup do banco antes de rodar em produção.
-- ============================================================

-- 1. Tabela de organizações (cada cliente/gatil/clínica é uma linha aqui)
create table if not exists organizacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  plano text default 'trial', -- 'trial', 'basico', 'clinica'
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- 2. Vincular cada usuário (perfil) a uma organização
alter table perfis
  add column if not exists organizacao_id uuid references organizacoes(id);

-- 3. Vincular cada paciente (gato) a uma organização
alter table gatos
  add column if not exists organizacao_id uuid references organizacoes(id);

-- ============================================================
-- 4. MIGRAÇÃO DOS DADOS EXISTENTES (seu gatil atual)
-- Antes de tornar a coluna obrigatória, crie uma organização
-- para os dados que já existem e vincule tudo a ela.
-- ============================================================

insert into organizacoes (nome, plano)
values ('Meu gatil (dados originais)', 'clinica')
returning id; -- copie o id gerado e use nas duas linhas abaixo

-- Substitua 'COLE_O_ID_AQUI' pelo id retornado acima
update gatos set organizacao_id = 'COLE_O_ID_AQUI' where organizacao_id is null;
update perfis set organizacao_id = 'COLE_O_ID_AQUI' where organizacao_id is null;

-- Agora sim, torne obrigatório para todo cadastro futuro
alter table gatos alter column organizacao_id set not null;

-- ============================================================
-- 5. RLS (Row Level Security) — a proteção que vale no banco,
-- não só na interface. Sem isso, qualquer usuário autenticado
-- pode enxergar ou alterar dados de qualquer organização.
-- ============================================================

alter table gatos enable row level security;

-- Remova policies antigas de acesso livre, se existirem, antes de recriar
drop policy if exists "usuarios autenticados veem tudo" on gatos;

create policy "select apenas da propria organizacao"
on gatos for select
using (
  organizacao_id = (select organizacao_id from perfis where id = auth.uid())
);

create policy "insert apenas na propria organizacao"
on gatos for insert
with check (
  organizacao_id = (select organizacao_id from perfis where id = auth.uid())
);

create policy "update apenas da propria organizacao"
on gatos for update
using (
  organizacao_id = (select organizacao_id from perfis where id = auth.uid())
);

create policy "delete apenas da propria organizacao"
on gatos for delete
using (
  organizacao_id = (select organizacao_id from perfis where id = auth.uid())
);

-- Perfis: cada usuário só pode ver colegas da própria organização
alter table perfis enable row level security;

drop policy if exists "usuarios veem proprio perfil" on perfis;

create policy "select perfis da propria organizacao"
on perfis for select
using (
  organizacao_id = (select organizacao_id from perfis where id = auth.uid())
  or id = auth.uid()
);

-- ============================================================
-- 6. FUNÇÕES RPC EXISTENTES — PRECISAM SER ATUALIZADAS
-- ============================================================
-- Seu sistema já usa duas funções RPC: `listar_gatos_visualizacao`
-- (usada pelo perfil "visualizador") e `arquivar_gato` (usada na
-- exclusão de paciente). O código dessas funções fica no Supabase,
-- não neste arquivo, então não tenho o texto exato delas.
--
-- IMPORTANTE: como são `security definer` (rodam com privilégio
-- elevado, ignorando RLS por padrão), ambas precisam filtrar por
-- organizacao_id manualmente dentro do SQL da função, algo como:
--
--   where organizacao_id = (select organizacao_id from perfis where id = auth.uid())
--
-- Sem esse filtro dentro da função, RLS não protege o retorno dela,
-- e um usuário de qualquer organização veria todos os gatos do banco.
--
-- Se você me enviar o SQL atual dessas duas funções (Database >
-- Functions no painel do Supabase), eu adapto exatamente com o
-- filtro certo.

-- ============================================================
-- 7. Como criar um novo cliente (gatil/clínica) a partir de agora
-- ============================================================
-- insert into organizacoes (nome, plano) values ('Nome do gatil novo', 'trial');
-- Depois, ao aprovar o primeiro usuário desse cliente na tabela `perfis`,
-- defina o organizacao_id dele para o id dessa nova organização.
