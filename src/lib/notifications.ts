export async function sendHandoffNotification(params: {
  contactName: string
  contactPhone: string
  conversationId: string
  organizationName: string
}) {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN
  const telegramChatId = process.env.TELEGRAM_CHAT_ID

  const message =
    `⚠️ *Transferencia a Humano*\n\n` +
    `🏢 *Organización:* ${params.organizationName}\n` +
    `👤 *Cliente:* ${params.contactName}\n` +
    `📱 *Teléfono:* ${params.contactPhone}\n\n` +
    `El bot ha sido desactivado y se requiere atención humana inmediata.\n` +
    `🔗 [Ver Conversación](${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/conversaciones/${params.conversationId})`

  // 1. Siempre registrar en consola para logs del contenedor en Dokploy
  console.log(
    `[Notification Alert] Handoff required for conversation ${params.conversationId}: ${params.contactName} (${params.contactPhone})`
  )

  // 2. Si las credenciales de Telegram están definidas, enviar HTTP POST
  if (telegramToken && telegramChatId) {
    try {
      const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: false,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error(`[Notification Error] Telegram API returned error: ${errText}`)
      } else {
        console.log(`[Notification Success] Handoff alert sent to Telegram chat ${telegramChatId}`)
      }
    } catch (error) {
      console.error('[Notification Error] Failed to send Telegram notification:', error)
    }
  }
}
