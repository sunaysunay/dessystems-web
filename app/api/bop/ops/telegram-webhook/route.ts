import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const callback = body.callback_query;
  if (!callback) return NextResponse.json({ ok: true });

  const data = callback.data ?? '';
  const chatId = callback.message?.chat?.id;
  const messageId = callback.message?.message_id;

  const [action, taskId] = data.split(':');
  if (!taskId) return NextResponse.json({ ok: true });

  const supabase = getServerClient();
  const botToken = process.env.BOP_TELEGRAM_BOT_TOKEN;
  if (!botToken) return NextResponse.json({ ok: true });

  let resultText = '';

  if (action === 'done') {
    const { error } = await supabase.rpc('op_task_transition', {
      p_task_id: taskId,
      p_to_status: 'done',
      p_actor: null,
      p_reason: 'Closed via Telegram',
    });
    resultText = error ? `Error: ${error.message}` : 'Task marked as Done';
  } else if (action === 'snooze') {
    const until = new Date(Date.now() + 4 * 3600000).toISOString();
    const { error } = await supabase.rpc('op_task_snooze', {
      p_task_id: taskId,
      p_until: until,
      p_actor: null,
    });
    resultText = error ? `Error: ${error.message}` : 'Snoozed for 4 hours';
  } else if (action === 'start') {
    const { error } = await supabase.rpc('op_task_transition', {
      p_task_id: taskId,
      p_to_status: 'in_progress',
      p_actor: null,
      p_reason: 'Started via Telegram',
    });
    resultText = error ? `Error: ${error.message}` : 'Task started';
  }

  // Answer the callback query
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callback.id, text: resultText }),
  });

  // Update the original message to show action taken
  if (chatId && messageId && !resultText.startsWith('Error')) {
    const origText = callback.message?.text ?? '';
    await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: `${origText}\n\n✅ ${resultText}`,
        parse_mode: 'HTML',
      }),
    });
  }

  return NextResponse.json({ ok: true });
}
