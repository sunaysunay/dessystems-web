-- dos_* tables with nullable tenant_id (isolation risk)
-- Must return zero rows to pass.

select c.table_name, c.column_name, c.is_nullable
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name like 'dos_%'
  and c.column_name = 'tenant_id'
  and c.is_nullable = 'YES'
order by c.table_name;
