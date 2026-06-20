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
