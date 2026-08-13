async function sendTelegram(text: string) {
  const token = process.env.BOP_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chat  = process.env.BOP_TELEGRAM_CHAT_ID   || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML' }),
    });
  } catch { /* non-blocking */ }
}

export async function notifyTaskCreated(taskNumber: string, title: string, assignee: string | null) {
  const tg = [
    `📋 <b>${taskNumber}</b> — New task created`,
    `📝 ${title}`,
    assignee ? `👤 Assigned to ${assignee}` : '👤 Unassigned',
    `🔗 https://bop.dessystems.io/console/ops/tasks`,
  ].join('\n');
  await sendTelegram(tg);
}

export async function notifyTaskOverdue(taskNumber: string, title: string, assignee: string | null, dueAt: string) {
  const tg = [
    `⚠️ <b>${taskNumber}</b> — Task overdue`,
    `📝 ${title}`,
    `📅 Was due: ${new Date(dueAt).toLocaleDateString()}`,
    assignee ? `👤 ${assignee}` : '👤 Unassigned',
    `🔗 https://bop.dessystems.io/console/ops/tasks`,
  ].join('\n');
  await sendTelegram(tg);
}

export async function notifySlaBreach(taskNumber: string, title: string, assignee: string | null, level: number) {
  const labels = ['Warning', 'Breach', 'Critical', 'Emergency'];
  const icons = ['⚠️', '🚨', '🔴', '🆘'];
  const tg = [
    `${icons[level] ?? '🚨'} <b>${taskNumber}</b> — SLA ${labels[level] ?? 'Escalation'}`,
    `📝 ${title}`,
    `📊 Escalation Level: L${level}`,
    assignee ? `👤 ${assignee}` : '👤 Unassigned',
    `🔗 https://bop.dessystems.io/console/ops/tasks`,
  ].join('\n');
  await sendTelegram(tg);
}
