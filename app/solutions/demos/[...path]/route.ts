import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join, extname } from "path"

export const dynamic = "force-dynamic"

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".gif": "image/gif",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params

  if (path.some((seg) => seg === ".." || seg.startsWith("."))) {
    return new NextResponse("Not Found", { status: 404 })
  }

  let filePath = join(process.cwd(), "public", "solutions", "demos", ...path)

  if (!extname(filePath)) filePath = join(filePath, "index.html")

  try {
    const content = await readFile(filePath)
    return new NextResponse(content, {
      headers: {
        "content-type": MIME[extname(filePath)] ?? "application/octet-stream",
        "cache-control": "public, max-age=3600",
      },
    })
  } catch {
    return new NextResponse("Not Found", { status: 404 })
  }
}
