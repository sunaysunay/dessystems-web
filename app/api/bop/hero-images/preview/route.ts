import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get('file')
  if (!file) return new NextResponse('No file', { status: 400 })
  
  // Prevent directory traversal
  const safeFile = path.basename(file)
  const filePath = path.join('/root/desmobil-web/public/hero', safeFile)
  
  try {
    const buffer = await readFile(filePath)
    
    // Determine content type
    let contentType = 'image/jpeg'
    if (safeFile.endsWith('.webp')) contentType = 'image/webp'
    else if (safeFile.endsWith('.png')) contentType = 'image/png'
    else if (safeFile.endsWith('.gif')) contentType = 'image/gif'
    else if (safeFile.endsWith('.svg')) contentType = 'image/svg+xml'
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
