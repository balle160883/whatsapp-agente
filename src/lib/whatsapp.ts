export const GRAPH_API_VERSION = 'v25.0'
export const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

interface SendTextMessageParams {
  phoneNumberId: string
  accessToken: string
  to: string
  text: string
}

interface WhatsAppAPIResponse {
  messages: Array<{ id: string }>
}

export async function sendWhatsAppMessage(
  params: SendTextMessageParams
): Promise<WhatsAppAPIResponse> {
  if (
    params.accessToken.startsWith('mock_') ||
    params.accessToken === 'mock' ||
    params.phoneNumberId.startsWith('mock_') ||
    params.phoneNumberId === 'mock'
  ) {
    console.log(`[WhatsApp Mock Send] To: ${params.to}, Text: ${params.text}`)
    return { messages: [{ id: `mock_msg_${Date.now()}` }] }
  }

  const url = `${GRAPH_API_BASE}/${params.phoneNumberId}/messages`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: params.to,
      type: 'text',
      text: {
        preview_url: false,
        body: params.text,
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`WhatsApp API error ${response.status}: ${errorBody}`)
  }

  return response.json() as Promise<WhatsAppAPIResponse>
}

export interface SendInteractiveMessageParams {
  phoneNumberId: string
  accessToken: string
  to: string
  bodyText: string
  buttons?: Array<{ id: string; title: string }> // Max 3
  list?: {
    buttonText: string
    sections: Array<{
      title?: string
      rows: Array<{ id: string; title: string; description?: string }>
    }>
  }
}

export async function sendWhatsAppInteractiveMessage(
  params: SendInteractiveMessageParams
): Promise<WhatsAppAPIResponse> {
  if (
    params.accessToken.startsWith('mock_') ||
    params.accessToken === 'mock' ||
    params.phoneNumberId.startsWith('mock_') ||
    params.phoneNumberId === 'mock'
  ) {
    console.log(
      `[WhatsApp Mock Interactive Send] To: ${params.to}, Body: ${
        params.bodyText
      }, Buttons: ${JSON.stringify(params.buttons)}, List: ${JSON.stringify(params.list)}`
    )
    return { messages: [{ id: `mock_msg_${Date.now()}` }] }
  }

  const url = `${GRAPH_API_BASE}/${params.phoneNumberId}/messages`

  let interactivePayload:
    | {
        type: 'button'
        body: { text: string }
        action: {
          buttons: Array<{ type: 'reply'; reply: { id: string; title: string } }>
        }
      }
    | {
        type: 'list'
        body: { text: string }
        action: {
          button: string
          sections: Array<{
            title: string
            rows: Array<{ id: string; title: string; description?: string }>
          }>
        }
      }

  if (params.buttons && params.buttons.length > 0) {
    interactivePayload = {
      type: 'button',
      body: { text: params.bodyText },
      action: {
        buttons: params.buttons.map((btn) => ({
          type: 'reply',
          reply: { id: btn.id, title: btn.title },
        })),
      },
    }
  } else if (params.list) {
    interactivePayload = {
      type: 'list',
      body: { text: params.bodyText },
      action: {
        button: params.list.buttonText,
        sections: params.list.sections.map((sec) => ({
          title: sec.title || 'Opciones',
          rows: sec.rows.map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description,
          })),
        })),
      },
    }
  } else {
    throw new Error('Either buttons or list must be provided for interactive messages')
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: params.to,
      type: 'interactive',
      interactive: interactivePayload,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`WhatsApp API error ${response.status}: ${errorBody}`)
  }

  return response.json() as Promise<WhatsAppAPIResponse>
}

export async function verifyWhatsAppConnection(
  phoneNumberId: string,
  accessToken: string
): Promise<{ success: boolean; displayPhoneNumber?: string; error?: string }> {
  try {
    const url = `${GRAPH_API_BASE}/${phoneNumberId}?fields=display_phone_number,verified_name`
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      const errorBody = (await response.json()) as { error: { message: string } }
      return { success: false, error: errorBody.error?.message }
    }

    const data = (await response.json()) as {
      display_phone_number: string
      verified_name: string
    }
    return {
      success: true,
      displayPhoneNumber: data.display_phone_number,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión',
    }
  }
}

interface SendTemplateMessageParams {
  phoneNumberId: string
  accessToken: string
  to: string
  templateName: string
  languageCode: string
  components?: unknown[]
}

export async function sendWhatsAppTemplate(
  params: SendTemplateMessageParams
): Promise<WhatsAppAPIResponse> {
  if (
    params.accessToken.startsWith('mock_') ||
    params.accessToken === 'mock' ||
    params.phoneNumberId.startsWith('mock_') ||
    params.phoneNumberId === 'mock'
  ) {
    console.log(
      `[WhatsApp Mock Template Send] To: ${params.to}, Template: ${params.templateName}, Language: ${params.languageCode}`
    )
    return { messages: [{ id: `mock_msg_tpl_${Date.now()}` }] }
  }

  const url = `${GRAPH_API_BASE}/${params.phoneNumberId}/messages`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: params.to,
      type: 'template',
      template: {
        name: params.templateName,
        language: {
          code: params.languageCode,
        },
        components: params.components || [],
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`WhatsApp API error ${response.status}: ${errorBody}`)
  }

  return response.json() as Promise<WhatsAppAPIResponse>
}

export interface ParsedInteractive {
  bodyText: string
  buttons?: Array<{ id: string; title: string }>
  list?: {
    buttonText: string
    sections: Array<{
      title?: string
      rows: Array<{ id: string; title: string; description?: string }>
    }>
  }
}

/**
 * Parses text response from the AI bot and converts it into a structured
 * WhatsApp Interactive Message (buttons or list) if it represents a choice menu.
 * Uses keywords and question presence heuristics to avoid false positives.
 */
export function parseTextToInteractive(text: string): ParsedInteractive | null {
  if (!text) return null

  // Safety Heuristic: Must look like a menu/question/prompt
  const lowercaseText = text.toLowerCase()
  const isMenu =
    lowercaseText.includes('?') ||
    lowercaseText.includes('selecciona') ||
    lowercaseText.includes('elige') ||
    lowercaseText.includes('califica') ||
    lowercaseText.includes('confirmar') ||
    lowercaseText.includes('reprogramar') ||
    lowercaseText.includes('cancelar') ||
    lowercaseText.includes('opción') ||
    lowercaseText.includes('opciones')

  if (!isMenu) return null

  // Split into lines
  const lines = text.split('\n')
  // Regex to match numbered lists e.g. "1. Option" or "1️⃣ Option"
  const optionRegex = /^(?:(\d+)[️⃣\.]?\s*)\s*(.+)$/i

  const optionLines: Array<{ index: number; lineIndex: number; text: string }> = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const match = optionRegex.exec(line)
    if (match) {
      let optionText = match[2].trim()
      // Remove leading hyphens, colons, or markdown bold stars
      optionText = optionText.replace(/^[\-\:\s\>\*]+/g, '').trim()

      if (optionText.length > 0) {
        optionLines.push({
          index: optionLines.length + 1,
          lineIndex: i,
          text: optionText,
        })
      }
    }
  }

  // We convert to interactive message if we have between 2 and 10 options,
  // and they form a contiguous block of lines at the end.
  if (optionLines.length >= 2 && optionLines.length <= 10) {
    const firstOptionLineIndex = optionLines[0].lineIndex
    const lastOptionLineIndex = optionLines[optionLines.length - 1].lineIndex

    const lineSpan = lastOptionLineIndex - firstOptionLineIndex + 1
    if (lineSpan === optionLines.length) {
      // Clean block of options! Extract body text (everything before the block)
      const bodyLines = lines.slice(0, firstOptionLineIndex)
      while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === '') {
        bodyLines.pop()
      }

      const bodyText = bodyLines.join('\n').trim() || 'Selecciona una opción:'

      if (optionLines.length <= 3) {
        // Quick Reply Buttons (Max 3)
        return {
          bodyText,
          buttons: optionLines.map((opt) => ({
            id: `opt_${opt.index}`,
            title: opt.text.substring(0, 20), // Meta API limit: 20 chars
          })),
        }
      } else {
        // List Message (4 to 10 options)
        return {
          bodyText,
          list: {
            buttonText: 'Ver opciones',
            sections: [
              {
                title: 'Opciones disponibles',
                rows: optionLines.map((opt) => ({
                  id: `opt_${opt.index}`,
                  title: opt.text.substring(0, 24), // Meta API limit: 24 chars
                })),
              },
            ],
          },
        }
      }
    }
  }

  return null
}
