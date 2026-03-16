
-- Update rpc_receita_total to exclude insurance/benefits categories
CREATE OR REPLACE FUNCTION public.rpc_receita_total(p_anomes integer[] DEFAULT NULL::integer[], p_banker text[] DEFAULT NULL::text[])
 RETURNS TABLE(receita numeric)
 LANGUAGE sql
 STABLE
AS $function$
  select sum(coalesce(c.comissao_bruta_tailor,0)) as receita
  from comissoes_consolidado_filtrado c
  where
    c.categoria is not null
    and c.categoria not in ('Garantia','Benefícios','Demais Ramos','Outros')
    and (p_anomes is null or c.anomes = any(p_anomes))
    and (p_banker is null or c.banker = any(p_banker));
$function$;

-- Update rpc_receita_mes_categoria (2-param version) to exclude
CREATE OR REPLACE FUNCTION public.rpc_receita_mes_categoria(p_anomes integer[] DEFAULT NULL::integer[], p_banker text[] DEFAULT NULL::text[])
 RETURNS TABLE(anomes integer, anomes_nome text, categoria text, valor numeric)
 LANGUAGE sql
 STABLE
AS $function$
  select
    c.anomes,
    d.anomes_nome,
    c.categoria,
    sum(coalesce(c.comissao_bruta_tailor,0)) as valor
  from comissoes_consolidado_filtrado c
  join vw_dim_anomes d on d.anomes = c.anomes
  where
    c.categoria is not null
    and c.categoria not in ('Garantia','Benefícios','Demais Ramos','Outros')
    and (p_anomes is null or c.anomes = any(p_anomes))
    and (p_banker is null or c.banker = any(p_banker))
  group by c.anomes, d.anomes_nome, c.categoria
  order by c.anomes, c.categoria;
$function$;

-- Update rpc_receita_treemap_categoria (2-param version) to exclude
CREATE OR REPLACE FUNCTION public.rpc_receita_treemap_categoria(p_anomes integer[] DEFAULT NULL::integer[], p_banker text[] DEFAULT NULL::text[])
 RETURNS TABLE(categoria text, valor numeric)
 LANGUAGE sql
 STABLE
AS $function$
  select
    c.categoria,
    sum(coalesce(c.comissao_bruta_tailor,0)) as valor
  from comissoes_consolidado_filtrado c
  where
    c.categoria is not null
    and c.categoria not in ('Garantia','Benefícios','Demais Ramos','Outros')
    and (p_anomes is null or c.anomes = any(p_anomes))
    and (p_banker is null or c.banker = any(p_banker))
  group by c.categoria
  order by valor desc;
$function$;

-- Update rpc_receita_matriz_rows to also exclude these categories
CREATE OR REPLACE FUNCTION public.rpc_receita_matriz_rows(p_anomes integer[] DEFAULT NULL::integer[], p_banker text[] DEFAULT NULL::text[])
 RETURNS TABLE(categoria text, subcategoria text, produto text, subproduto text, anomes integer, anomes_nome text, valor numeric)
 LANGUAGE sql
 STABLE
AS $function$
  select
    c.categoria,
    c.subcategoria,
    c.produto,
    c.subproduto,
    c.anomes,
    d.anomes_nome,
    sum(coalesce(c.comissao_bruta_tailor,0)) as valor
  from comissoes_consolidado_filtrado c
  join vw_dim_anomes d on d.anomes = c.anomes
  where
    c.categoria is not null
    and c.categoria not in ('Garantia','Benefícios','Demais Ramos','Outros')
    and (p_anomes is null or c.anomes = any(p_anomes))
    and (p_banker is null or c.banker = any(p_banker))
  group by c.categoria, c.subcategoria, c.produto, c.subproduto, c.anomes, d.anomes_nome
  order by c.categoria, c.subcategoria, c.produto, c.subproduto, c.anomes;
$function$;
