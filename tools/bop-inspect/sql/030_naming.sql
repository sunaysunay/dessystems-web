-- Columns with camelCase names (convention violation)
-- Must return zero rows to pass.

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and column_name ~ '[A-Z]'
order by table_name, column_name;
