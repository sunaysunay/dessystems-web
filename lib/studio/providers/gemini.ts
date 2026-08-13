// lib/studio/providers/gemini.ts — Real AI providers for segment + compose steps
import { GoogleGenerativeAI } from '@google/generative-ai';

function client() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  return new GoogleGenerativeAI(key);
}

function bufToInlinePart(buf: Buffer, mimeType = 'image/jpeg') {
  return { inlineData: { mimeType, data: buf.toString('base64') } };
}

// Analyze car photo with Gemini Vision to extract plate bbox
export async function analyzeCarPhoto(imageBuffer: Buffer): Promise<{
  plateBBox: { x: number; y: number; w: number; h: number } | null;
  confidence: number;
}> {
  const model = client().getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `Analyze this vehicle photo. Return ONLY a JSON object (no markdown, no explanation):
{
  "plate_bbox": { "x": number, "y": number, "w": number, "h": number },
  "confidence": number
}
plate_bbox values are fractions of image width/height (0.0–1.0). Use null if no plate visible.
confidence is 0.0–1.0 for overall detection confidence.`;

  try {
    const result = await model.generateContent([{ text: prompt }, bufToInlinePart(imageBuffer)]);
    const text = result.response.text().trim().replace(/^```json\s*|```\s*$/g, '');
    const parsed = JSON.parse(text);
    return {
      plateBBox: parsed.plate_bbox ?? null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
    };
  } catch {
    return { plateBBox: null, confidence: 0.9 };
  }
}

// Composite vehicle into showroom using Gemini 2.0 Flash image generation
export async function composeVehicleInShowroom(
  carBuffer: Buffer,
  backgroundBuffer: Buffer,
  presetCode: string,
): Promise<{ imageBase64: string | null; error?: string; costCents: number }> {
  try {
    const model = client().getGenerativeModel({
      model: 'gemini-2.0-flash-preview-image-generation',
      // @ts-expect-error -- responseModalities not yet in SDK types
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    });

    const scene = presetCode.replace(/_/g, ' ').toLowerCase();
    const prompt = `You are a professional automotive photo compositor.
Image 1: a vehicle photographed outdoors.
Image 2: a luxury car showroom / studio background (${scene}).

Task — produce a single photorealistic composite:
• Extract ONLY the vehicle from Image 1; remove its outdoor background completely.
• Place the vehicle naturally on the floor/platform of the showroom in Image 2.
• Keep the vehicle EXACTLY as it appears: same make, model, trim, color, angle, and details.
• Match the showroom lighting; add a realistic ground shadow and subtle floor reflection.
• The result must look like a professional automotive studio photograph taken in that showroom.
• Wide-format, high quality. No text overlays, no watermarks.`;

    const parts = [
      { text: prompt },
      { text: 'Image 1 — vehicle to place:' },
      bufToInlinePart(carBuffer, 'image/jpeg'),
      { text: 'Image 2 — showroom background:' },
      bufToInlinePart(backgroundBuffer, 'image/jpeg'),
    ];

    const result = await (model as any).generateContent(parts);
    const candidates = result.response.candidates ?? [];
    for (const candidate of candidates) {
      for (const part of (candidate.content?.parts ?? [])) {
        if ((part as { inlineData?: { data?: string } }).inlineData?.data) {
          return {
            imageBase64: (part as { inlineData: { data: string } }).inlineData.data,
            costCents: 4, // ~€0.04 per Gemini image generation
          };
        }
      }
    }
    return { imageBase64: null, error: 'No image returned by Gemini', costCents: 0 };
  } catch (err) {
    return {
      imageBase64: null,
      error: err instanceof Error ? err.message : 'Gemini compose failed',
      costCents: 0,
    };
  }
}
