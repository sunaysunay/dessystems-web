import { NextRequest, NextResponse } from 'next/server'
import { stat } from 'fs/promises'
import path from 'path'

export async function GET(req: NextRequest) {
  try {
    const file = req.nextUrl.searchParams.get('file')
    if (!file || !file.startsWith('/hero/')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    const heroDir = '/root/desmobil-web/public/hero'
    const fileName = file.replace('/hero/', '')
    // Prevent directory traversal
    if (fileName.includes('/') || fileName.includes('..')) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 })
    }

    const filePath = path.join(heroDir, fileName)
    const { size } = await stat(filePath)

    return NextResponse.json({ size })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
