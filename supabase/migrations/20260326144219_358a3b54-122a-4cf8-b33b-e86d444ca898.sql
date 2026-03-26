
CREATE OR REPLACE VIEW cap_captacao_total_all AS
WITH src AS (
  SELECT raw_captacao_total.id,
    raw_captacao_total.ingested_at,
    NULLIF(TRIM(BOTH FROM COALESCE(raw_captacao_total.data ->> 'Data', '')), '') AS data_raw,
    raw_captacao_total.data
  FROM raw_captacao_total
)
SELECT id,
  ingested_at,
  CASE
    WHEN data_raw ~ '^\d{4}-\d{2}-\d{2}' THEN to_date(substr(data_raw, 1, 10), 'YYYY-MM-DD')
    WHEN data_raw ~ '^\d{2}/\d{2}/\d{4}' THEN to_date(substr(data_raw, 1, 10), 'DD/MM/YYYY')
    WHEN data_raw ~ '^\d{1,2}/\d{1,2}/\d{2,4}' THEN to_date(data_raw, 'MM/DD/YY')
    ELSE NULL::date
  END AS data_ref,
  CASE
    WHEN data_raw ~ '^\d{4}-\d{2}-\d{2}' THEN EXTRACT(year FROM to_date(substr(data_raw, 1, 10), 'YYYY-MM-DD'))::integer * 100 + EXTRACT(month FROM to_date(substr(data_raw, 1, 10), 'YYYY-MM-DD'))::integer
    WHEN data_raw ~ '^\d{2}/\d{2}/\d{4}' THEN EXTRACT(year FROM to_date(substr(data_raw, 1, 10), 'DD/MM/YYYY'))::integer * 100 + EXTRACT(month FROM to_date(substr(data_raw, 1, 10), 'DD/MM/YYYY'))::integer
    WHEN data_raw ~ '^\d{1,2}/\d{1,2}/\d{2,4}' THEN EXTRACT(year FROM to_date(data_raw, 'MM/DD/YY'))::integer * 100 + EXTRACT(month FROM to_date(data_raw, 'MM/DD/YY'))::integer
    ELSE NULL::integer
  END AS anomes,
  NULLIF(TRIM(BOTH FROM COALESCE(data ->> 'Documento', '')), '') AS documento,
  NULLIF(TRIM(BOTH FROM COALESCE(data ->> 'Banker', '')), '') AS banker,
  NULLIF(TRIM(BOTH FROM COALESCE(data ->> 'Advisor', '')), '') AS advisor,
  NULLIF(TRIM(BOTH FROM COALESCE(data ->> 'Finder', '')), '') AS finder,
  NULLIF(TRIM(BOTH FROM COALESCE(data ->> 'Canal', '')), '') AS canal,
  NULLIF(TRIM(BOTH FROM COALESCE(data ->> 'Casa', '')), '') AS casa,
  NULLIF(TRIM(BOTH FROM COALESCE(data ->> 'Tipo de Cliente', '')), '') AS tipo_cliente,
  NULLIF(TRIM(BOTH FROM COALESCE(data ->> 'Tipo de Captação', '')), '') AS tipo_captacao,
  parse_num_any(data ->> 'Aporte') AS aporte,
  parse_num_any(data ->> 'Resgate') AS resgate,
  parse_num_any(data ->> 'Captação') AS captacao
FROM src;
