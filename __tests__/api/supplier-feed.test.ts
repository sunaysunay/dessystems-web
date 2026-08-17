// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSupabaseMock, type Call } from '../helpers/supabase-mock'

const getServerClient = vi.fn()

vi.mock('@/lib/supabase-server', () => ({ getServerClient: async () => getServerClient() }))

import { POST } from '@/app/api/hooks/supplier/route'

const SUPPLIER = { id: 'sup-1' }

function feedRequest(body: unknown) {
  return { json: async () => body } as any
}

const items = [
  { supplier_sku: 'SKU-1', cost_price: 10.5, stock_qty: 4, description: 'Widget' },
  { supplier_sku: 'SKU-2', cost_price: 20, stock_qty: 0, description: 'Gadget', currency: 'USD' },
]

/**
 * `upsertResults` is consumed one per upsert call, letting a test make some
 * rows land and others fail.
 */
function makeClient(upsertResults: Array<{ error: any }>, supplier: any = SUPPLIER) {
  const queue = [...upsertResults]
  return createSupabaseMock((call: Call) => {
    if (call.table === 'shop_suppliers') {
      const isLookup = call.ops.some((o) => o.method === 'select')
      if (isLookup) return { data: supplier, error: supplier ? null : { message: 'not found' } }
      return { data: null, error: null }
    }
    if (call.table === 'shop_supplier_variants') {
      return queue.shift() ?? { error: null }
    }
    return { data: null, error: null }
  })
}

beforeEach(() => vi.clearAllMocks())

describe('supplier feed webhook', () => {
  it('writes feed_stock_qty, never the non-existent stock_qty column', async () => {
    const sb = makeClient([{ error: null }, { error: null }])
    getServerClient.mockReturnValue(sb)

    await POST(feedRequest({ supplier_code: 'ACME', items }))

    const payload = sb.argsFor('shop_supplier_variants', 'upsert')![0]
    expect(payload).toHaveProperty('feed_stock_qty', 4)
    expect(payload).not.toHaveProperty('stock_qty')
    expect(payload).toMatchObject({
      supplier_id: 'sup-1',
      supplier_sku: 'SKU-1',
      cost_price: 10.5,
      currency: 'EUR',
    })
  })

  it('upserts on the supplier_id,supplier_sku conflict target', async () => {
    const sb = makeClient([{ error: null }, { error: null }])
    getServerClient.mockReturnValue(sb)

    await POST(feedRequest({ supplier_code: 'ACME', items }))

    const upsertArgs = sb.argsFor('shop_supplier_variants', 'upsert')!
    expect(upsertArgs[1]).toEqual({ onConflict: 'supplier_id,supplier_sku' })
  })

  it('returns 200 and stamps the supplier when every row lands', async () => {
    const sb = makeClient([{ error: null }, { error: null }])
    getServerClient.mockReturnValue(sb)

    const res = await POST(feedRequest({ supplier_code: 'ACME', items }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toMatchObject({ received: 2, upserted: 2, failed: 0 })
    expect(sb.argsFor('shop_suppliers', 'update')?.[0]).toHaveProperty('feed_last_synced_at')
  })

  it('returns 422 when every row fails', async () => {
    const sb = makeClient([{ error: { message: 'boom' } }, { error: { message: 'boom' } }])
    getServerClient.mockReturnValue(sb)

    const res = await POST(feedRequest({ supplier_code: 'ACME', items }))
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.data).toMatchObject({ received: 2, upserted: 0, failed: 2 })
    expect(body.data.errors).toHaveLength(2)
  })

  it('does not stamp feed_last_synced_at when nothing upserted', async () => {
    const sb = makeClient([{ error: { message: 'boom' } }, { error: { message: 'boom' } }])
    getServerClient.mockReturnValue(sb)

    await POST(feedRequest({ supplier_code: 'ACME', items }))

    // The only supplier interaction is the code lookup — no freshness update.
    const supplierOps = sb.callsTo('shop_suppliers').flatMap((c) => c.ops.map((o) => o.method))
    expect(supplierOps).not.toContain('update')
  })

  it('returns 207 on a partial failure', async () => {
    const sb = makeClient([{ error: null }, { error: { message: 'bad sku' } }])
    getServerClient.mockReturnValue(sb)

    const res = await POST(feedRequest({ supplier_code: 'ACME', items }))
    const body = await res.json()

    expect(res.status).toBe(207)
    expect(body.data).toMatchObject({ received: 2, upserted: 1, failed: 1 })
    expect(body.data.errors[0]).toContain('SKU-2')
  })

  it('still stamps the supplier on a partial success', async () => {
    const sb = makeClient([{ error: null }, { error: { message: 'bad sku' } }])
    getServerClient.mockReturnValue(sb)

    await POST(feedRequest({ supplier_code: 'ACME', items }))

    expect(sb.argsFor('shop_suppliers', 'update')?.[0]).toHaveProperty('feed_last_synced_at')
  })

  it('counts an item missing supplier_sku as a failure and skips the upsert', async () => {
    const sb = makeClient([])
    getServerClient.mockReturnValue(sb)

    const res = await POST(
      feedRequest({ supplier_code: 'ACME', items: [{ cost_price: 1, stock_qty: 1 }] })
    )
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.data).toMatchObject({ received: 1, upserted: 0, failed: 1 })
    expect(sb.callsTo('shop_supplier_variants')).toHaveLength(0)
  })

  it('rejects a malformed body with 400', async () => {
    getServerClient.mockReturnValue(makeClient([]))
    const res = await POST(feedRequest({ supplier_code: 'ACME' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown supplier code', async () => {
    getServerClient.mockReturnValue(makeClient([], null))
    const res = await POST(feedRequest({ supplier_code: 'NOPE', items }))
    expect(res.status).toBe(404)
  })

  it('stamps every variant with the same per-variant sync time', async () => {
    const sb = makeClient([{ error: null }, { error: null }])
    getServerClient.mockReturnValue(sb)

    await POST(feedRequest({ supplier_code: 'ACME', items }))

    const payloads = sb
      .callsTo('shop_supplier_variants')
      .flatMap((c) => c.ops)
      .filter((o) => o.method === 'upsert')
      .map((o) => o.args[0])

    expect(payloads).toHaveLength(2)
    expect(payloads[0].feed_synced_at).toBe(payloads[1].feed_synced_at)
    expect(typeof payloads[0].feed_synced_at).toBe('string')
  })
})
