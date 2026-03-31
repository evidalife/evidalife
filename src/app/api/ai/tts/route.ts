import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

// Map locale to best OpenAI TTS voice
const VOICE_MAP: Record<string, 'nova' | 'echo' | 'onyx' | 'alloy' | 'fable' | 'shimmer'> = {
  en: 'nova',
  de: 'echo',
  fr: 'nova',
  es: 'nova',
  it: 'nova',
};

export async function POST(req: NextRequest) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 501 });
  }

  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { text?: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { text, lang = 'en' } = body;
  if (!text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const voice = VOICE_MAP[lang] ?? 'nova';

  try {
    const openai = new OpenAI({ apiKey: openaiKey });
    const response = await openai.audio.speech.create({
      model: 'tts-1-hd',
      voice,
      input: text,
      response_format: 'mp3',
    });

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
