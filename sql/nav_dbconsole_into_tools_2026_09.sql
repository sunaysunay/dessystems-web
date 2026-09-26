-- Move Database Console (DB001-DB009) from System into Tools as sub-menu 'databaseConsole'.
BEGIN;
UPDATE bop_screens SET nav_group='tools', nav_subgroup='databaseConsole'
WHERE nav_group='system' AND nav_subgroup='databaseConsole';
COMMIT;
