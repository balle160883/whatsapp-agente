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
