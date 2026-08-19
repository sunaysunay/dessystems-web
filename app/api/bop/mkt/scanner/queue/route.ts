import { NextRequest, NextResponse } from "next/server";
import { scannerQueue } from "@/lib/mkt/scanner-queue";

/* ------------------------------------------------------------------ */
/*  GET /api/bop/mkt/scanner/queue                                    */
/*  Returns queue status and recent jobs.                             */
/*  Optional query params: connector, status, limit (default 50)      */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const connector = searchParams.get("connector") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const limit = Math.min(
      Number(searchParams.get("limit") ?? 50),
      200,
    );

    const queueStatus = scannerQueue.getStatus();
    const jobs = scannerQueue.getJobs(connector, status).slice(0, limit);

    return NextResponse.json({ status: queueStatus, jobs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  POST /api/bop/mkt/scanner/queue                                   */
/*  Enqueues a new scan job.                                          */
/*  Body: { connector: string, payload: any, priority?: number }      */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { connector, payload, priority } = body ?? {};

    if (!connector || typeof connector !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'connector' field" },
        { status: 400 },
      );
    }

    if (payload === undefined) {
      return NextResponse.json(
        { error: "Missing 'payload' field" },
        { status: 400 },
      );
    }

    const id = scannerQueue.enqueue(
      connector,
      payload,
      typeof priority === "number" ? priority : 0,
    );

    // Trigger processing (fire-and-forget).
    scannerQueue.process().catch(() => {});

    return NextResponse.json({ id, queued: true }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
