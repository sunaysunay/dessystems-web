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

export async function notifyOssThreshold(currentPct: number, thresholdEur: number, currentEur: number) {
  const tg = [
    `⚠️ <b>OSS Threshold Alert</b> — ${currentPct}% reached`,
    `💶 Current: €${currentEur.toLocaleString()} / €${thresholdEur.toLocaleString()} annual limit`,
    `📋 Action: Review cross-border B2C sales and prepare OSS registration if needed`,
    `🔗 https://bop-dev.dessystems.io/console/shp/finance/vat`,
  ].join('\n');
  await sendTelegram(tg);
}

export async function notifyRefundAwaitingApproval(refundId: string, orderNumber: string, amountCents: number, reason: string | null) {
  const tg = [
    `💰 <b>Refund Awaiting Approval</b>`,
    `📦 Order: ${orderNumber}`,
    `💶 Amount: €${(amountCents / 100).toFixed(2)}`,
    reason ? `📝 Reason: ${reason}` : '',
    `🔗 https://bop-dev.dessystems.io/console/shp/finance/payments`,
  ].filter(Boolean).join('\n');
  await sendTelegram(tg);
}

export async function notifyUnmatchedPayment(paymentId: string, amountCents: number, provider: string) {
  const tg = [
    `🚨 <b>Unmatched Payment</b>`,
    `🏦 Provider: ${provider}`,
    `💶 Amount: €${(amountCents / 100).toFixed(2)}`,
    `🔑 Payment ID: ${paymentId}`,
    `📋 Action: Manually reconcile in Settlement Reconciliation`,
    `🔗 https://bop-dev.dessystems.io/console/shp/finance/settlements`,
  ].join('\n');
  await sendTelegram(tg);
}

export async function notifyPaymentFailed(orderNumber: string, amountCents: number, reason: string) {
  const tg = [
    `❌ <b>Payment Failed</b>`,
    `📦 Order: ${orderNumber}`,
    `💶 Amount: €${(amountCents / 100).toFixed(2)}`,
    `📝 Reason: ${reason}`,
    `🔗 https://bop-dev.dessystems.io/console/shp/orders`,
  ].join('\n');
  await sendTelegram(tg);
}

export async function notifyStockCriticalLow(sku: string, productName: string, currentQty: number, reorderPoint: number) {
  const tg = [
    `📦 <b>Critical Low Stock</b>`,
    `🏷️ ${sku} — ${productName}`,
    `📊 Current: ${currentQty} / Reorder point: ${reorderPoint}`,
    `📋 Action: Create purchase order`,
    `🔗 https://bop-dev.dessystems.io/console/shp/inventory`,
  ].join('\n');
  await sendTelegram(tg);
}

export async function notifyClaimSlaBreach(claimNumber: string, orderNumber: string, hoursOpen: number) {
  const tg = [
    `⏰ <b>Claim SLA Breach</b>`,
    `🔖 Claim: ${claimNumber}`,
    `📦 Order: ${orderNumber}`,
    `⏱️ Open for ${hoursOpen}h (SLA: 24h)`,
    `📋 Action: Triage and respond immediately`,
    `🔗 https://bop-dev.dessystems.io/console/shp/aftersales/claims`,
  ].join('\n');
  await sendTelegram(tg);
}

export async function notifyFulfilmentOverdue(orderNumber: string, daysSinceOrder: number) {
  const tg = [
    `🚚 <b>Fulfilment Overdue</b>`,
    `📦 Order: ${orderNumber}`,
    `📅 ${daysSinceOrder} days since order placed`,
    `📋 Action: Check pick/pack queue`,
    `🔗 https://bop-dev.dessystems.io/console/shp/orders`,
  ].join('\n');
  await sendTelegram(tg);
}

export async function notifyStockReconciliationVariance(totalVariances: number, totalItems: number) {
  const tg = [
    `📋 <b>Nightly Stock Reconciliation</b>`,
    `📊 ${totalVariances} variances found across ${totalItems} items`,
    `📋 Action: Review and post adjustments`,
    `🔗 https://bop-dev.dessystems.io/console/shp/inventory`,
  ].join('\n');
  await sendTelegram(tg);
}

export async function notifySupplierFeedStale(supplierName: string, lastSyncHoursAgo: number) {
  const tg = [
    `⚠️ <b>Supplier Feed Stale</b>`,
    `🏭 Supplier: ${supplierName}`,
    `⏱️ Last sync: ${lastSyncHoursAgo}h ago (threshold: 24h)`,
    `📋 Action: Check feed URL and supplier connectivity`,
    `🔗 https://bop-dev.dessystems.io/console/shp/procurement/suppliers`,
  ].join('\n');
  await sendTelegram(tg);
}
