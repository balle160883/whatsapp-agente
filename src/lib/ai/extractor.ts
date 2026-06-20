import { getProvider } from '@/lib/ai/agent'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function extractAndSaveContactInfo(
  organizationId: string,
  contactId: string,
  conversationId: string
): Promise<void> {
  try {
    // 1. Obtener contacto y los últimos 10 mensajes
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    })

    if (!contact) return

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    if (messages.length === 0) return

    // Revertir para orden cronológico
    const chatHistory = messages
      .reverse()
      .map((m) => `${m.sender === 'CLIENT' ? 'Cliente' : 'Agente/Bot'}: ${m.content}`)
      .join('\n')

    // 2. Obtener proveedor de IA
    const provider = await getProvider(organizationId)

    const systemPrompt = `Eres un extractor de datos de CRM de IA para una clínica o negocio de servicios.
Tu tarea es analizar la conversación provista y extraer la siguiente información del cliente de forma estructurada:
- fullName: Nombre completo del cliente (si lo proporciona o se le llama de esa forma).
- email: Dirección de correo electrónico.
- birthdate: Fecha de nacimiento o edad mencionada.
- reason: Motivo principal de la consulta o cita (breve y conciso, máximo 6 palabras).
- allergies: Alergias o condiciones de salud importantes mencionadas.
- notes: Otras notas relevantes (preferencias, presupuesto, etc., máximo 15 palabras).

Combina los datos extraídos con la información existente del contacto en formato JSON que se te provee a continuación.

Datos existentes del contacto (JSON):
${JSON.stringify(contact.metadata || {})}

INSTRUCCIONES DE SALIDA:
- Devuelve exclusivamente un objeto JSON válido.
- No añadas explicaciones, no agregues preámbulos, no uses comillas invertidas de código markdown.
- Devuelve EXACTAMENTE el formato JSON con las claves: "fullName", "email", "birthdate", "reason", "allergies", "notes".
- Si un dato no se menciona en la conversación y no existe en los datos previos, déjalo como null o string vacío.`

    const aiRes = await provider.generateResponse(
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Historial de Chat:\n${chatHistory}\n\nExtrae y devuelve el JSON.`,
        },
      ],
      []
    )

    const text = aiRes.content?.trim()
    if (!text) return

    // Buscar bloque JSON con regex
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('[CRM Extractor] No JSON block found in AI response:', text)
      return
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      fullName?: string | null
      email?: string | null
      birthdate?: string | null
      reason?: string | null
      allergies?: string | null
      notes?: string | null
    }

    if (parsed) {
      const currentMetadata = (contact.metadata as Record<string, unknown>) || {}
      const updatedMetadata = {
        ...currentMetadata,
        email: parsed.email || currentMetadata.email || null,
        birthdate: parsed.birthdate || currentMetadata.birthdate || null,
        reason: parsed.reason || currentMetadata.reason || null,
        allergies: parsed.allergies || currentMetadata.allergies || null,
        notes: parsed.notes || currentMetadata.notes || null,
      }

      const updateData: {
        metadata: Prisma.InputJsonValue
        fullName?: string
      } = {
        metadata: updatedMetadata as Prisma.InputJsonValue,
      }

      if (parsed.fullName && !contact.fullName) {
        updateData.fullName = parsed.fullName
      }

      await prisma.contact.update({
        where: { id: contactId },
        data: updateData,
      })

      console.log(`[CRM Extractor] Successfully updated contact info for ${contactId}`)
    }
  } catch (error) {
    console.error('[CRM Extractor] Error extracting contact info:', error)
  }
}
