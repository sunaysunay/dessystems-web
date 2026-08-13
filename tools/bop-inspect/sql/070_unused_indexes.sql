-- Indexes with zero scans (removal candidates)
-- Must return zero rows to pass.

select schemaname, tablename, indexname, idx_scan
from pg_stat_user_indexes
where schemaname = 'public'
  and idx_scan = 0
  and indexname not like '%_pkey'
  and indexname not like '%_unique'
order by tablename, indexname;
