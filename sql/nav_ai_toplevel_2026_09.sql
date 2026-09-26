-- Promote AI Platform (AI001-AI005) from System sub-menu to its own top-level group 'ai'.
BEGIN;
UPDATE bop_screens SET nav_group='ai', nav_subgroup=NULL
WHERE nav_group='system' AND nav_subgroup='aiPlatform';
COMMIT;
