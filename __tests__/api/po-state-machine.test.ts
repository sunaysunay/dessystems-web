// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSupabaseMock, type Call } from '../helpers/supabase-mock'

const getServerClient = vi.fn()
const requirePermission = vi.fn(async (_permissionId: string) => ({ ok: true, uid: 'user-1' }) as any)

vi.mock('@/lib/supabase-server', () => ({ getServerClient: async () => getServerClient() }))
vi.mock('@/lib/permission-guard', () => ({
  requirePermission: (p: string) => requirePermission(p),
}))

import { PATCH } from '@/app/api/bop/shop/procure/po/route'

const PO_ID = 'po-1'

function patchRequest(body: unknown) {
  return { json: async () => body } as any
}

/** Supabase stub where the PO currently sits in `currentStatus`. */
function makeClient(currentStatus: string | null) {
  return createSupabaseMock((call: Call) => {
    if (call.table !== 'shop_purchase_orders') return { data: null, error: null }
    const isFetch = call.ops[0]?.method === 'select'
    if (isFetch) {
      return currentStatus
        ? { data: { status: currentStatus }, error: null }
        : { data: null, error: { message: 'no rows' } }
    }
    return { data: { id: PO_ID, status: currentStatus }, error: null }
  })
}

async function transition(from: string, to: string) {
  const sb = makeClient(from)
  getServerClient.mockReturnValue(sb)
  const res = await PATCH(patchRequest({ id: PO_ID, status: to }))
  return { res, sb, body: await res.json() }
}

beforeEach(() => {
  vi.clearAllMocks()
  requirePermission.mockResolvedValue({ ok: true, uid: 'user-1' } as any)
})

// The transition map as implemented in the route.
const VALID: Array<[string, string]> = [
  ['draft', 'approved'],
  ['approved', 'sent'],
  ['sent', 'received'],
  ['sent', 'closed'],
  ['received', 'closed'],
  ['partial', 'received'],
  ['partial', 'closed'],
]

const INVALID: Array<[string, string]> = [
  ['draft', 'sent'],
  ['draft', 'received'],
  ['draft', 'closed'],
  ['approved', 'received'],
  ['approved', 'closed'],
  ['approved', 'draft'],
  ['sent', 'approved'],
  ['sent', 'draft'],
  ['received', 'approved'],
  ['received', 'sent'],
  ['partial', 'approved'],
  ['partial', 'draft'],
  // 'closed' is terminal — it has no entry in the map at all.
  ['closed', 'received'],
  ['closed', 'draft'],
  ['closed', 'approved'],
]

describe('PO state machine', () => {
  it.each(VALID)('permits %s -> %s', async (from, to) => {
    const { res, sb } = await transition(from, to)

    expect(res.status).toBe(200)
    const update = sb.argsFor('shop_purchase_orders', 'update')![0]
    expect(update.status).toBe(to)
  })

  it.each(INVALID)('rejects %s -> %s', async (from, to) => {
    const { res, sb, body } = await transition(from, to)

    expect(res.status).toBe(400)
    expect(body.error).toBe(`Cannot transition from '${from}' to '${to}'`)
    // Nothing may be written when the transition is refused.
    const ops = sb.callsTo('shop_purchase_orders').flatMap((c) => c.ops.map((o) => o.method))
    expect(ops).not.toContain('update')
  })

  it('allows a no-op status write without consulting the map', async () => {
    const { res } = await transition('sent', 'sent')
    expect(res.status).toBe(200)
  })

  it('allows a notes-only edit with no status change', async () => {
    const sb = makeClient('sent')
    getServerClient.mockReturnValue(sb)

    const res = await PATCH(patchRequest({ id: PO_ID, notes: 'chased supplier' }))

    expect(res.status).toBe(200)
    const update = sb.argsFor('shop_purchase_orders', 'update')![0]
    expect(update.notes).toBe('chased supplier')
    expect(update.status).toBeUndefined()
  })

  it('stamps approved_at and takes the approver from the auth guard', async () => {
    const sb = makeClient('draft')
    getServerClient.mockReturnValue(sb)

    const res = await PATCH(
      // A client-supplied approver id must not be trusted.
      patchRequest({ id: PO_ID, status: 'approved', approved_by: 'attacker' })
    )

    expect(res.status).toBe(200)
    const update = sb.argsFor('shop_purchase_orders', 'update')![0]
    expect(update.approved_by).toBe('user-1')
    expect(update.approved_at).toBeTruthy()
  })

  it('stamps sent_at on approved -> sent', async () => {
    const { sb } = await transition('approved', 'sent')
    expect(sb.argsFor('shop_purchase_orders', 'update')![0].sent_at).toBeTruthy()
  })

  it('stamps closed_at on sent -> closed', async () => {
    const { sb } = await transition('sent', 'closed')
    expect(sb.argsFor('shop_purchase_orders', 'update')![0].closed_at).toBeTruthy()
  })

  it('requires the dedicated approve permission for an approval', async () => {
    await transition('draft', 'approved')
    expect(requirePermission).toHaveBeenCalledWith('shop.po.approve')
  })

  it('requires only procurement write for a non-approval transition', async () => {
    await transition('approved', 'sent')
    expect(requirePermission).toHaveBeenCalledWith('shop.procurement.write')
  })

  it('refuses the transition when the permission guard denies', async () => {
    requirePermission.mockResolvedValue({
      ok: false,
      response: Response.json({ error: 'forbidden' }, { status: 403 }),
    } as any)
    const sb = makeClient('draft')
    getServerClient.mockReturnValue(sb)

    const res = await PATCH(patchRequest({ id: PO_ID, status: 'approved' }))

    expect(res.status).toBe(403)
    expect(sb.callsTo('shop_purchase_orders')).toHaveLength(0)
  })

  it('requires an id', async () => {
    getServerClient.mockReturnValue(makeClient('draft'))
    const res = await PATCH(patchRequest({ status: 'approved' }))
    expect(res.status).toBe(400)
  })

  it('404s for a PO that does not exist', async () => {
    getServerClient.mockReturnValue(makeClient(null))
    const res = await PATCH(patchRequest({ id: 'missing', status: 'approved' }))
    expect(res.status).toBe(404)
  })
})
