REFRESH MATERIALIZED VIEW public.mv_dimensoes_filtro;
SELECT cron.alter_job(job_id := 36::bigint, active := true);