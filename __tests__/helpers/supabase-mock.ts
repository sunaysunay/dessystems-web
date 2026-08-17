import { vi } from 'vitest'

export type Op = { method: string; args: any[] }
export type Call = { table: string; ops: Op[] }

/**
 * A chainable stand-in for the supabase-js query builder.
 *
 * Every `.from(table)` starts a new recorded Call; each subsequent builder
 * method appends to `call.ops`. The chain is thenable, so both terminal styles
 * used by the routes work: `await sb.from(t).update(x).eq(...)` and
 * `await sb.from(t).select().eq().single()`.
 *
 * `resolve` is given the call-so-far and returns the `{ data, error }` the
 * route should see, letting a test drive different tables differently without
 * ever touching a real database.
 */
export function createSupabaseMock(resolve: (call: Call) => any = () => null) {
  const calls: Call[] = []

  const from = vi.fn((table: string) => {
    const call: Call = { table, ops: [] }
    calls.push(call)

    const chain: any = new Proxy(
      {},
      {
        get(_target, prop: string | symbol) {
          if (prop === 'then') {
            return (onFulfilled: any, onRejected: any) =>
              Promise.resolve(resolve(call) ?? { data: null, error: null }).then(
                onFulfilled,
                onRejected
              )
          }
          if (typeof prop !== 'string') return undefined
          return (...args: any[]) => {
            call.ops.push({ method: prop, args })
            if (prop === 'single' || prop === 'maybeSingle') {
              return Promise.resolve(resolve(call) ?? { data: null, error: null })
            }
            return chain
          }
        },
      }
    )

    return chain
  })

  return {
    from,
    rpc: vi.fn(async () => ({ data: null, error: null })),
    /** Recorded calls, in order. */
    calls,
    /** All calls made against a given table. */
    callsTo(table: string) {
      return calls.filter((c) => c.table === table)
    },
    /** Args passed to the first `method` invocation on `table`, or undefined. */
    argsFor(table: string, method: string) {
      for (const c of calls) {
        if (c.table !== table) continue
        const op = c.ops.find((o) => o.method === method)
        if (op) return op.args
      }
      return undefined
    },
  }
}

export type SupabaseMock = ReturnType<typeof createSupabaseMock>
