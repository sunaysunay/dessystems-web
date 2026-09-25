-- Fold the Master Data group into Operations as a sub-menu 'masterData'.
BEGIN;

-- Operations root: true operational screens only
UPDATE bop_screens SET nav_group='operations', nav_subgroup=NULL, nav_order=1 WHERE screen_id='AS001'; -- Inventory
UPDATE bop_screens SET nav_group='operations', nav_subgroup=NULL, nav_order=2 WHERE screen_id='IN001'; -- Catalog Overview

-- Operations › Master Data
UPDATE bop_screens SET nav_group='operations', nav_subgroup='masterData', nav_order=1 WHERE screen_id='MD001'; -- Business Partners
UPDATE bop_screens SET nav_group='operations', nav_subgroup='masterData', nav_order=2 WHERE screen_id='IN004'; -- Suppliers
UPDATE bop_screens SET nav_group='operations', nav_subgroup='masterData', nav_order=3 WHERE screen_id='IN002'; -- Brands
UPDATE bop_screens SET nav_group='operations', nav_subgroup='masterData', nav_order=4 WHERE screen_id='IN006'; -- Model Catalog
UPDATE bop_screens SET nav_group='operations', nav_subgroup='masterData', nav_order=5 WHERE screen_id='IN003'; -- Listing Categories
UPDATE bop_screens SET nav_group='operations', nav_subgroup='masterData', nav_order=6 WHERE screen_id='IN005'; -- Publish Structures
UPDATE bop_screens SET nav_group='operations', nav_subgroup='masterData', nav_order=7 WHERE screen_id='MD003'; -- Vehicle Taxonomy
UPDATE bop_screens SET nav_group='operations', nav_subgroup='masterData', nav_order=8 WHERE screen_id='MD004'; -- Equipment Catalog (v3)
UPDATE bop_screens SET nav_group='operations', nav_subgroup='masterData', nav_order=99 WHERE screen_id='MD002'; -- Partner Detail (hidden)

-- Retire the old top-level group value
UPDATE bop_screens SET nav_group='operations', nav_subgroup='masterData' WHERE nav_group='masterData';

COMMIT;
