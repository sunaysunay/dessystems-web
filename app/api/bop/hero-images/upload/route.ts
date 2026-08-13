import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink, stat } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File
    const quality = form.get('quality') as string || 'balanced'
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    let videoScale = "scale='min(1280,iw)':min'(720,ih)':force_original_aspect_ratio=decrease"
    let videoBitrate = "-b:v 600k -maxrate 800k -bufsize 1200k"
    let imgWidth = 1280
    let imgQuality = 65

    if (quality === 'high') {
      videoScale = "scale='min(1920,iw)':min'(1080,ih)':force_original_aspect_ratio=decrease"
      videoBitrate = "-b:v 1500k -maxrate 2000k -bufsize 3000k"
      imgWidth = 1920
      imgQuality = 85
    } else if (quality === 'low') {
      videoScale = "scale='min(854,iw)':min'(480,ih)':force_original_aspect_ratio=decrease"
      videoBitrate = "-b:v 300k -maxrate 400k -bufsize 800k"
      imgWidth = 1024
      imgQuality = 50
    }

    const bytes = await file.arrayBuffer()
    const buf = Buffer.from(bytes)

    // Save to desmobil-web public/hero folder
    const heroDir = '/root/desmobil-web/public/hero'
    await mkdir(heroDir, { recursive: true })

    const safeName = file.name.replace(/[^a-z0-9._-]/gi, '-').toLowerCase()
    
    // Check if it's a video
    if (file.type.startsWith('video/') || safeName.match(/\.(mp4|webm|mov)$/i)) {
      const finalName = safeName.replace(/\.[^/.]+$/, "") + ".mp4"
      const tempInPath = path.join('/tmp', `in_${Date.now()}_${safeName}`)
      const tempOutPath = path.join('/tmp', `out_${Date.now()}_${finalName}`)
      const finalPath = path.join(heroDir, finalName)

      await writeFile(tempInPath, buf)

      // Compress aggressively based on quality selection
      const cmd = `ffmpeg -i ${tempInPath} -vcodec libx264 -preset veryfast ${videoBitrate} -an -vf "${videoScale}" -y ${tempOutPath}`
      await execAsync(cmd)

      // Move from /tmp to /hero
      const compressedCmd = `mv ${tempOutPath} ${finalPath}`
      await execAsync(compressedCmd)

      // Cleanup
      await unlink(tempInPath).catch(() => {})

      const { size } = await stat(finalPath)

      return NextResponse.json({ path: `/hero/${finalName}`, name: finalName, size })
    } else {
      // It's an image, convert to webp to save space
      const finalName = safeName.replace(/\.[^/.]+$/, "") + ".webp"
      const filePath = path.join(heroDir, finalName)

      // Optimize with sharp based on quality selection
      const optimizedBuffer = await sharp(buf)
        .resize({ width: imgWidth, withoutEnlargement: true })
        .webp({ quality: imgQuality, effort: 6 })
        .toBuffer()

      await writeFile(filePath, optimizedBuffer)
      
      const { size } = await stat(filePath)

      return NextResponse.json({ path: `/hero/${finalName}`, name: finalName, size })
    }
  } catch (e: any) {
    console.error("Upload error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
