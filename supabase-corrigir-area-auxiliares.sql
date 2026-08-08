-- FelineOS: correção das contas antigas de auxiliares sem área definida.
-- Execute este arquivo INTEIRO uma única vez no SQL Editor do Supabase.
-- Contas de auxiliares que estejam como "todos" serão vinculadas ao Gatil.
-- Depois, use o felineos-admin.html para mudar para CTI quem trabalhar no CTI.

begin;

alter table public.perfis
    add column if not exists area_acesso text not null default 'todos';

update public.perfis
   set area_acesso = 'gatil'
 where funcao = 'auxiliar'
   and coalesce(administrador, false) = false
   and coalesce(area_acesso, 'todos') not in ('gatil', 'cti');

commit;

-- Conferência: nenhuma conta retornada abaixo deve permanecer como "todos".
select nome, email, funcao, ativo, administrador, area_acesso
  from public.perfis
 where funcao = 'auxiliar'
 order by nome, email;
