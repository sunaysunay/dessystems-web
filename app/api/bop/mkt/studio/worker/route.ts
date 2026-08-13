// app/api/bop/mkt/studio/worker/route.ts — job queue worker
// Called by PM2 cron every 30s with STUDIO_WORKER_SECRET header
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { analyzeCarPhoto, composeVehicleInShowroom } from '@/lib/studio/providers/gemini';
import { applyPlateOp } from '@/lib/studio/ops/plate';
import { applyBrand } from '@/lib/studio/ops/brand';
import { exportForTarget } from '@/lib/studio/ops/export';
import type { StudioSettings, StudioPlateBBox } from '@/lib/studio/types';
import { STEP_ORDER } from '@/lib/studio/types';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const WORKER_SECRET = process.env.STUDIO_WORKER_SECRET ?? '';
const WORKER_ID = `worker-${process.pid}-${Date.now()}`;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [60_000, 300_000];

export async function POST(req: NextRequest) {
  if (WORKER_SECRET && req.headers.get('x-studio-worker-secret') !== WORKER_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sb = getServerClient();

  // Claim jobs atomically
  const { data: jobs, error: claimErr } = await sb.rpc('bop_studio_claim_jobs', {
    worker_id: WORKER_ID,
    batch_size: 3,
  });
  if (claimErr) return NextResponse.json({ error: claimErr.message }, { status: 500 });
  if (!jobs?.length) return NextResponse.json({ ok: true, processed: 0 });

  const results: { step_id: string; ok: boolean; err?: string }[] = [];

  for (const job of jobs) {
    const result = await processJob(sb, job);
    results.push({ step_id: job.step_id, ...result });

    if (!result.ok) {
      const newAttempts = job.attempts + 1;
      if (newAttempts >= MAX_ATTEMPTS) {
        // Mark step + image failed
        await sb.from('bop_studio_steps').update({ status: 'failed', finished_at: new Date().toISOString() }).eq('id', job.step_id);
        const { data: step } = await sb.from('bop_studio_steps').select('image_id').eq('id', job.step_id).single();
        if (step) {
          await sb.from('bop_studio_images').update({ status: 'failed', error: result.err?.slice(0, 500) }).eq('id', step.image_id);
          await checkSessionComplete(sb, step.image_id);
        }
        // Delete job
        await sb.from('bop_studio_jobs').delete().eq('id', job.id);
      } else {
        // Retry with backoff
        const delayMs = RETRY_DELAYS_MS[newAttempts - 1] ?? 300_000;
        const runAfter = new Date(Date.now() + delayMs).toISOString();
        await sb.from('bop_studio_jobs').update({ locked_by: null, locked_at: null, attempts: newAttempts, run_after: runAfter }).eq('id', job.id);
      }
    } else {
      await sb.from('bop_studio_jobs').delete().eq('id', job.id);
    }
  }

  return NextResponse.json({ ok: true, processed: jobs.length, results });
}

async function processJob(sb: ReturnType<typeof getServerClient>, job: { id: number; step_id: string; attempts: number }): Promise<{ ok: boolean; err?: string }> {
  const { data: step, error } = await sb
    .from('bop_studio_steps')
    .select('*, bop_studio_images(*, bop_studio_sessions(*))')
    .eq('id', job.step_id)
    .single();

  if (error || !step) return { ok: false, err: 'Step not found' };

  await sb.from('bop_studio_steps').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', step.id);

  try {
    const image = step.bop_studio_images;
    const session = image.bop_studio_sessions;
    const settings: StudioSettings = { ...session.settings, ...(image.overrides ?? {}) };

    let outputPath: string | undefined;
    let costCents = 0;

    if (step.kind === 'segment') {
      // Download original photo and analyze with Gemini Vision to detect plate bbox
      const { data: imgBlob } = await sb.storage.from('studio').download(image.original_path).catch(() => ({ data: null }));
      let plateBBox = null;
      let confidence = 0.9;
      if (imgBlob) {
        const imgBuf = Buffer.from(await imgBlob.arrayBuffer());
        const analysis = await analyzeCarPhoto(imgBuf);
        plateBBox = analysis.plateBBox;
        confidence = analysis.confidence;
      }
      await sb.from('bop_studio_steps').update({
        status: 'done',
        output: { originalPath: image.original_path, plateBBox, confidence, provider: 'gemini-vision' },
        provider: 'gemini-vision', cost_cents: 0, finished_at: new Date().toISOString(),
      }).eq('id', step.id);
      await enqueueNextStep(sb, step);
      return { ok: true };
    }

    if (step.kind === 'compose') {
      // Resolve showroom background: session override -> preset default
      let backgroundPath: string | null = (settings as Record<string, unknown>).backgroundPath as string ?? null;
      if (!backgroundPath) {
        const { data: defaultBg } = await sb
          .from('bop_studio_preset_backgrounds')
          .select('storage_path')
          .eq('preset_code', session.preset_code ?? 'SHOWROOM_WHITE')
          .eq('is_default', true)
          .maybeSingle();
        backgroundPath = defaultBg?.storage_path ?? null;
      }

      // Download car photo and showroom background
      const { data: carBlob } = await sb.storage.from('studio').download(image.original_path).catch(() => ({ data: null }));
      const { data: bgBlob } = backgroundPath
        ? await sb.storage.from('studio').download(backgroundPath).catch(() => ({ data: null }))
        : { data: null };

      let composedPath: string;
      let composerProvider = 'gemini-compose';

      if (carBlob && bgBlob) {
        const carBuf = Buffer.from(await carBlob.arrayBuffer());
        const bgBuf = Buffer.from(await bgBlob.arrayBuffer());
        const presetCode = session.preset_code ?? 'SHOWROOM_WHITE';

        const gemResult = await composeVehicleInShowroom(carBuf, bgBuf, presetCode);
        costCents = gemResult.costCents;

        if (gemResult.imageBase64) {
          const outBuf = Buffer.from(gemResult.imageBase64, 'base64');
          const outPath = `${session.id}/${image.id}/composed.jpg`;
          await sb.storage.from('studio').upload(outPath, outBuf, { contentType: 'image/jpeg', upsert: true });
          composedPath = outPath;
        } else {
          // Gemini failed: sharp fallback (overlay car on background)
          const bgBuffer = Buffer.from(await bgBlob.arrayBuffer());
          const meta = await sharp(bgBuffer).metadata();
          const w = meta.width ?? 1920;
          const h = meta.height ?? 1080;
          const carResized = await sharp(carBuf).resize(Math.round(w * 0.85), Math.round(h * 0.85), { fit: 'inside' }).toBuffer();
          const fallbackBuf = await sharp(bgBuffer).composite([{ input: carResized, gravity: 'south', blend: 'over' }]).jpeg({ quality: 92 }).toBuffer();
          const outPath = `${session.id}/${image.id}/composed.jpg`;
          await sb.storage.from('studio').upload(outPath, fallbackBuf, { contentType: 'image/jpeg', upsert: true });
          composedPath = outPath;
          composerProvider = 'sharp-fallback';
          costCents = 0;
        }
      } else {
        composedPath = image.original_path;
        composerProvider = 'passthrough';
      }

      await sb.from('bop_studio_steps').update({
        status: 'done', output: { resultPath: composedPath, provider: composerProvider },
        provider: composerProvider, cost_cents: costCents, finished_at: new Date().toISOString(),
      }).eq('id', step.id);
      void sb.rpc('bop_studio_add_cost', { session_id: session.id, cents: costCents });
      await enqueueNextStep(sb, step);
      return { ok: true };
    }

    if (step.kind === 'plate') {
      const { data: segStep } = await sb.from('bop_studio_steps').select('output').eq('image_id', step.image_id).eq('step_no', 0).single();
      const plateBBox = (segStep?.output as { plateBBox?: StudioPlateBBox } | null)?.plateBBox;
      const plateOp = settings.plateOp ?? 'blur';

      // In mock: compose output is a data URI; in real impl download the composed image
      const { data: compStep } = await sb.from('bop_studio_steps').select('output').eq('image_id', step.image_id).eq('step_no', 1).single();
      const composedPath: string = (compStep?.output as { resultPath?: string } | null)?.resultPath ?? image.original_path;

      const { data: imgData } = await sb.storage.from('studio').download(composedPath).catch(() => ({ data: null }));
      let buf: Buffer;
      if (imgData) {
        buf = Buffer.from(await imgData.arrayBuffer());
        buf = await applyPlateOp(buf, plateOp, plateBBox, { ...(settings.plateColor !== undefined && { blankColor: settings.plateColor }) });
        const platePath = `${session.id}/${image.id}/plated.jpg`;
        await sb.storage.from('studio').upload(platePath, buf, { contentType: 'image/jpeg', upsert: true });
        outputPath = platePath;
      } else {
        outputPath = composedPath; // fallback
      }

      await sb.from('bop_studio_steps').update({
        status: 'done', output: { resultPath: outputPath }, cost_cents: 0, finished_at: new Date().toISOString(),
      }).eq('id', step.id);

      await enqueueNextStep(sb, step);
      return { ok: true };
    }

    if (step.kind === 'brand') {
      const { data: plateStep } = await sb.from('bop_studio_steps').select('output').eq('image_id', step.image_id).eq('step_no', 2).single();
      const inputPath: string = (plateStep?.output as { resultPath?: string } | null)?.resultPath ?? image.original_path;

      let finalBuf: Buffer | null = null;
      if (settings.logoEnabled) {
        const { data: imgData } = await sb.storage.from('studio').download(inputPath).catch(() => ({ data: null }));
        if (imgData) {
          const imgBuf = Buffer.from(await imgData.arrayBuffer());
          // Fetch logo from storage (per-tenant logo at tenants/{tenant_id}/logo.png)
          const { data: logoBlobData } = await sb.storage.from('studio').download('logo/dealer-logo.png').catch(() => ({ data: null }));
          if (logoBlobData) {
            const logoBuf = Buffer.from(await logoBlobData.arrayBuffer());
            finalBuf = await applyBrand(imgBuf, {
              logoBuffer: logoBuf,
              position: settings.logoPosition ?? 'TR',
              opacity: settings.logoOpacity ?? 0.9,
              sizePercent: settings.logoSizePercent ?? 14,
              marginPx: settings.logoMarginPx ?? 24,
            });
          } else {
            finalBuf = imgBuf; // no logo file, skip
          }
        }
      }

      const brandedPath = `${session.id}/${image.id}/branded.jpg`;
      if (finalBuf) {
        await sb.storage.from('studio').upload(brandedPath, finalBuf, { contentType: 'image/jpeg', upsert: true });
        outputPath = brandedPath;
      } else {
        outputPath = inputPath;
      }

      await sb.from('bop_studio_steps').update({
        status: 'done', output: { resultPath: outputPath }, cost_cents: 0, finished_at: new Date().toISOString(),
      }).eq('id', step.id);

      await enqueueNextStep(sb, step);
      return { ok: true };
    }

    if (step.kind === 'export') {
      const { data: brandStep } = await sb.from('bop_studio_steps').select('output').eq('image_id', step.image_id).eq('step_no', 3).single();
      const masterPath: string = (brandStep?.output as { resultPath?: string } | null)?.resultPath ?? image.original_path;

      const { data: imgData } = await sb.storage.from('studio').download(masterPath).catch(() => ({ data: null }));
      const exportedTargets: string[] = [];

      if (imgData) {
        const imgBuf = Buffer.from(await imgData.arrayBuffer());
        const targets = settings.exportTargets ?? ['website'];

        const { data: targetRows } = await sb.from('bop_studio_export_targets').select('*').in('code', targets);

        for (const target of (targetRows ?? [])) {
          const res = await exportForTarget(imgBuf, target);
          const exportPath = `${session.id}/${image.id}/export/${target.code}.${res.format}`;
          await sb.storage.from('studio').upload(exportPath, res.buffer, { contentType: `image/${res.format}`, upsert: true });
          exportedTargets.push(exportPath);
        }
      }

      await sb.from('bop_studio_steps').update({
        status: 'done', output: { resultPath: masterPath, targets: exportedTargets }, cost_cents: 0, finished_at: new Date().toISOString(),
      }).eq('id', step.id);

      // Mark image done
      await sb.from('bop_studio_images').update({ status: 'done' }).eq('id', image.id);
      await checkSessionComplete(sb, image.id);
      return { ok: true };
    }

    return { ok: false, err: `Unknown step kind: ${step.kind}` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await sb.from('bop_studio_steps').update({ status: 'failed', finished_at: new Date().toISOString() }).eq('id', step.id);
    return { ok: false, err: msg };
  }
}

async function enqueueNextStep(sb: ReturnType<typeof getServerClient>, step: { image_id: string; step_no: number }) {
  const nextStepNo = step.step_no + 1;
  if (nextStepNo >= STEP_ORDER.length) return;

  const { data: nextStep } = await sb
    .from('bop_studio_steps')
    .select('id')
    .eq('image_id', step.image_id)
    .eq('step_no', nextStepNo)
    .single();

  if (nextStep) {
    await sb.from('bop_studio_jobs').insert({ step_id: nextStep.id, run_after: new Date().toISOString() });
  }
}

async function checkSessionComplete(sb: ReturnType<typeof getServerClient>, imageId: string) {
  const { data: img } = await sb.from('bop_studio_images').select('session_id').eq('id', imageId).single();
  if (!img) return;

  const { data: allImages } = await sb
    .from('bop_studio_images')
    .select('status')
    .eq('session_id', img.session_id);

  const allTerminal = allImages?.every(i => ['done', 'failed', 'skipped'].includes(i.status));
  if (allTerminal) {
    await sb.from('bop_studio_sessions').update({ status: 'review', updated_at: new Date().toISOString() }).eq('id', img.session_id);
  }
}
