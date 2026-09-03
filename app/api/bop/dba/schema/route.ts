export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getReadPool } from '@/lib/db-console/pools';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const action = sp.get('action') ?? 'schemas';
  const schema = sp.get('schema') ?? 'public';
  const table = sp.get('table');

  const pool = getReadPool();

  try {
    switch (action) {
      case 'schemas': {
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_schemas()');
        return NextResponse.json({ schemas: rows });
      }
      case 'tables': {
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_tables($1)', [schema]);
        return NextResponse.json({ tables: rows });
      }
      case 'columns': {
        if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 });
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_columns($1, $2)', [schema, table]);
        return NextResponse.json({ columns: rows });
      }
      case 'indexes': {
        if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 });
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_indexes($1, $2)', [schema, table]);
        return NextResponse.json({ indexes: rows });
      }
      case 'fkeys': {
        if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 });
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_foreign_keys($1, $2)', [schema, table]);
        return NextResponse.json({ foreign_keys: rows });
      }
      case 'policies': {
        if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 });
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_policies($1, $2)', [schema, table]);
        return NextResponse.json({ policies: rows });
      }
      case 'triggers': {
        if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 });
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_triggers($1, $2)', [schema, table]);
        return NextResponse.json({ triggers: rows });
      }
      case 'enums': {
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_enums($1)', [schema]);
        return NextResponse.json({ enums: rows });
      }
      case 'extensions': {
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_extensions()');
        return NextResponse.json({ extensions: rows });
      }
      case 'table_screens': {
        const { rows } = await pool.query(`
          SELECT sm.screen_id, s.title, s.module, s.route,
                 jsonb_array_elements_text(sm.db_tables) AS table_name
          FROM bop_screen_meta sm
          JOIN bop_screens s ON s.screen_id = sm.screen_id
          WHERE sm.db_tables IS NOT NULL
            AND jsonb_typeof(sm.db_tables) = 'array'
          ORDER BY sm.screen_id
        `);
        const map: Record<string, { screen_id: string; title: string; module: string; route: string }[]> = {};
        for (const r of rows) {
          if (!map[r.table_name]) map[r.table_name] = [];
          map[r.table_name].push({ screen_id: r.screen_id, title: r.title, module: r.module, route: r.route });
        }
        return NextResponse.json({ table_screens: map });
      }
      case 'all_fkeys': {
        const { rows } = await pool.query(`
          SELECT
            conname AS constraint_name,
            src.relname AS source_table,
            tgt.relname AS target_table,
            array_agg(sa.attname ORDER BY x.ord) AS source_columns,
            array_agg(ta.attname ORDER BY x.ord) AS target_columns
          FROM pg_constraint c
          JOIN pg_class src ON src.oid = c.conrelid
          JOIN pg_class tgt ON tgt.oid = c.confrelid
          JOIN pg_namespace ns ON ns.oid = src.relnamespace
          CROSS JOIN LATERAL unnest(c.conkey, c.confkey) WITH ORDINALITY AS x(src_att, tgt_att, ord)
          JOIN pg_attribute sa ON sa.attrelid = c.conrelid AND sa.attnum = x.src_att
          JOIN pg_attribute ta ON ta.attrelid = c.confrelid AND ta.attnum = x.tgt_att
          WHERE c.contype = 'f' AND ns.nspname = $1
          GROUP BY c.conname, src.relname, tgt.relname
          ORDER BY src.relname, tgt.relname
        `, [schema]);
        return NextResponse.json({ foreign_keys: rows });
      }
      case 'table_detail': {
        if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 });
        const [cols, idx, fks, pol, trg] = await Promise.all([
          pool.query('SELECT * FROM bop_meta.list_columns($1, $2)', [schema, table]),
          pool.query('SELECT * FROM bop_meta.list_indexes($1, $2)', [schema, table]),
          pool.query('SELECT * FROM bop_meta.list_foreign_keys($1, $2)', [schema, table]),
          pool.query('SELECT * FROM bop_meta.list_policies($1, $2)', [schema, table]),
          pool.query('SELECT * FROM bop_meta.list_triggers($1, $2)', [schema, table]),
        ]);
        return NextResponse.json({
          columns: cols.rows,
          indexes: idx.rows,
          foreign_keys: fks.rows,
          policies: pol.rows,
          triggers: trg.rows,
        });
      }
      case 'table_health': {
        if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 });
        const { rows } = await pool.query(`
          SELECT
            s.schemaname,
            s.relname AS table_name,
            s.n_live_tup AS live_tuples,
            s.n_dead_tup AS dead_tuples,
            CASE WHEN s.n_live_tup + s.n_dead_tup > 0
              THEN round((s.n_dead_tup::numeric / (s.n_live_tup + s.n_dead_tup)) * 100, 1)
              ELSE 0
            END AS dead_pct,
            s.last_vacuum,
            s.last_autovacuum,
            s.last_analyze,
            s.last_autoanalyze,
            s.vacuum_count,
            s.autovacuum_count,
            s.analyze_count,
            s.autoanalyze_count,
            s.n_tup_ins AS inserts,
            s.n_tup_upd AS updates,
            s.n_tup_del AS deletes,
            s.n_tup_hot_upd AS hot_updates,
            s.seq_scan,
            s.seq_tup_read,
            s.idx_scan,
            s.idx_tup_fetch,
            pg_total_relation_size(c.oid) AS total_bytes,
            pg_table_size(c.oid) AS table_bytes,
            pg_indexes_size(c.oid) AS index_bytes,
            pg_total_relation_size(c.oid) - pg_table_size(c.oid) - pg_indexes_size(c.oid) AS toast_bytes,
            age(c.relfrozenxid) AS xid_age,
            c.relpages,
            c.reltuples::bigint AS pg_estimate
          FROM pg_stat_user_tables s
          JOIN pg_class c ON c.relname = s.relname
          JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = s.schemaname
          WHERE s.schemaname = $1 AND s.relname = $2
        `, [schema, table]);

        if (rows.length === 0) {
          return NextResponse.json({ health: null });
        }

        const h = rows[0];
        const deadPct = parseFloat(h.dead_pct);
        const xidAge = parseInt(h.xid_age, 10);
        const seqScan = parseInt(h.seq_scan, 10);
        const idxScan = parseInt(h.idx_scan, 10);
        const totalScans = seqScan + idxScan;

        const assessments: { key: string; label: string; value: string; status: 'in_range' | 'monitor' | 'urgent'; detail: string }[] = [];

        assessments.push({
          key: 'dead_tuples',
          label: 'Dead Tuple Ratio',
          value: `${deadPct}%`,
          status: deadPct < 5 ? 'in_range' : deadPct < 15 ? 'monitor' : 'urgent',
          detail: `${Number(h.dead_tuples).toLocaleString()} dead / ${(Number(h.live_tuples) + Number(h.dead_tuples)).toLocaleString()} total`,
        });

        assessments.push({
          key: 'xid_age',
          label: 'Transaction ID Age',
          value: Number(xidAge).toLocaleString(),
          status: xidAge < 100_000_000 ? 'in_range' : xidAge < 500_000_000 ? 'monitor' : 'urgent',
          detail: xidAge > 500_000_000 ? 'Approaching XID wraparound — VACUUM urgently' : xidAge > 100_000_000 ? 'Consider manual VACUUM FREEZE' : 'Within safe range',
        });

        const seqPct = totalScans > 0 ? Math.round((seqScan / totalScans) * 100) : 0;
        assessments.push({
          key: 'scan_ratio',
          label: 'Sequential Scan Ratio',
          value: `${seqPct}% seq`,
          status: seqPct < 50 || totalScans < 100 ? 'in_range' : seqPct < 80 ? 'monitor' : 'urgent',
          detail: `${seqScan.toLocaleString()} seq / ${idxScan.toLocaleString()} idx scans`,
        });

        const lastVac = h.last_autovacuum || h.last_vacuum;
        const daysSinceVacuum = lastVac ? Math.round((Date.now() - new Date(lastVac).getTime()) / 86400000) : null;
        assessments.push({
          key: 'vacuum_age',
          label: 'Last Vacuum',
          value: daysSinceVacuum !== null ? `${daysSinceVacuum}d ago` : 'Never',
          status: daysSinceVacuum === null ? 'monitor' : daysSinceVacuum < 7 ? 'in_range' : daysSinceVacuum < 30 ? 'monitor' : 'urgent',
          detail: lastVac ? new Date(lastVac).toISOString().slice(0, 16).replace('T', ' ') : 'No vacuum recorded',
        });

        return NextResponse.json({
          health: {
            ...h,
            assessments,
          },
        });
      }
      case 'tables_health': {
        const { rows } = await pool.query(`
          SELECT
            s.relname AS table_name,
            s.n_dead_tup AS dead_tuples,
            CASE WHEN s.n_live_tup + s.n_dead_tup > 0
              THEN round((s.n_dead_tup::numeric / (s.n_live_tup + s.n_dead_tup)) * 100, 1)
              ELSE 0
            END AS dead_pct,
            age(c.relfrozenxid) AS xid_age,
            s.last_autovacuum,
            s.last_vacuum
          FROM pg_stat_user_tables s
          JOIN pg_class c ON c.relname = s.relname
          JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = s.schemaname
          WHERE s.schemaname = $1
          ORDER BY s.relname
        `, [schema]);

        const summary = rows.map((r: any) => {
          const deadPct = parseFloat(r.dead_pct);
          const xidAge = parseInt(r.xid_age, 10);
          const lastVac = r.last_autovacuum || r.last_vacuum;
          const daysSinceVacuum = lastVac ? Math.round((Date.now() - new Date(lastVac).getTime()) / 86400000) : null;

          let worst: 'in_range' | 'monitor' | 'urgent' = 'in_range';
          if (deadPct >= 15 || xidAge >= 500_000_000 || (daysSinceVacuum !== null && daysSinceVacuum >= 30) || daysSinceVacuum === null) {
            if (deadPct >= 15 || xidAge >= 500_000_000) worst = 'urgent';
            else if (worst !== 'urgent') worst = 'monitor';
          } else if (deadPct >= 5 || xidAge >= 100_000_000 || (daysSinceVacuum !== null && daysSinceVacuum >= 7)) {
            worst = 'monitor';
          }
          return { table_name: r.table_name, status: worst, dead_pct: deadPct };
        });
        return NextResponse.json({ health: summary });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}
